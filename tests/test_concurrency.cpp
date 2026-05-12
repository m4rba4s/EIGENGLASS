#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include "../src/core/thread_pool.hpp"
#include <atomic>
#include <vector>

using namespace axiom::core;

TEST_CASE("LockFreeQueue Push and Pop", "[concurrency]") {
    LockFreeQueue<int, 1024> queue;
    
    REQUIRE(queue.push(42) == true);
    REQUIRE(queue.push(100) == true);
    
    int val = 0;
    REQUIRE(queue.pop(val) == true);
    REQUIRE(val == 42);
    
    REQUIRE(queue.pop(val) == true);
    REQUIRE(val == 100);
    
    REQUIRE(queue.pop(val) == false); // Empty
}

TEST_CASE("ThreadPool Stress Test", "[concurrency]") {
    ThreadPool pool(4);
    
    std::atomic<int> counter{0};
    constexpr int NUM_TASKS = 10000;
    
    for (int i = 0; i < NUM_TASKS; ++i) {
        bool pushed = false;
        while (!pushed) {
            pushed = pool.submit([&counter]() {
                counter.fetch_add(1, std::memory_order_relaxed);
            });
            if (!pushed) {
                std::this_thread::yield();
            }
        }
    }
    
    pool.wait();
    
    REQUIRE(counter.load() == NUM_TASKS);
}
