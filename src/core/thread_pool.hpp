#pragma once

#include "lock_free_queue.hpp"
#include <thread>
#include <vector>
#include <functional>
#include <atomic>

namespace axiom::core {

class ThreadPool {
public:
    using Task = std::function<void()>;

private:
    LockFreeQueue<Task, 65536> queue;
    std::vector<std::thread> workers;
    std::atomic<bool> running{true};
    std::atomic<size_t> active_tasks{0};

    void worker_loop() {
        while (running.load(std::memory_order_acquire)) {
            Task task;
            if (queue.pop(task)) {
                task();
                active_tasks.fetch_sub(1, std::memory_order_release);
            } else {
                // Spin-wait instead of heavy context switch
                AXIOM_PAUSE();
                std::this_thread::yield(); 
            }
        }
    }

public:
    ThreadPool(size_t num_threads = std::thread::hardware_concurrency()) {
        if (num_threads == 0) num_threads = 2;
        // Keep 1 thread for main loop, use rest for workers
        size_t workers_count = num_threads > 1 ? num_threads - 1 : 1;
        
        for (size_t i = 0; i < workers_count; ++i) {
            workers.emplace_back(&ThreadPool::worker_loop, this);
        }
    }

    ~ThreadPool() {
        wait();
        running.store(false, std::memory_order_release);
        for (auto& t : workers) {
            if (t.joinable()) t.join();
        }
    }

    bool submit(Task task) {
        active_tasks.fetch_add(1, std::memory_order_acquire);
        if (!queue.push(task)) {
            active_tasks.fetch_sub(1, std::memory_order_release);
            return false; // Queue is full
        }
        return true;
    }

    void wait() {
        // Spin until all active tasks are processed
        while (active_tasks.load(std::memory_order_acquire) > 0) {
            AXIOM_PAUSE();
            std::this_thread::yield();
        }
    }
};

} // namespace axiom::core
