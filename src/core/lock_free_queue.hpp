#pragma once

#include <atomic>
#include <cstddef>
#include <new>

#if defined(__x86_64__) || defined(_M_X64)
#include <immintrin.h>
#define AXIOM_PAUSE() _mm_pause()
#else
#define AXIOM_PAUSE()
#endif

namespace axiom::core {

template <typename T, size_t Capacity>
class LockFreeQueue {
    static_assert((Capacity != 0) && ((Capacity & (Capacity - 1)) == 0), "Capacity must be a power of 2");

private:
    struct Cell {
        std::atomic<size_t> sequence;
        T data;
    };

    // Cacheline padding to prevent false sharing
    alignas(64) std::atomic<size_t> enqueue_pos{0};
    alignas(64) std::atomic<size_t> dequeue_pos{0};
    alignas(64) Cell buffer[Capacity];

    static constexpr size_t MASK = Capacity - 1;

public:
    LockFreeQueue() {
        for (size_t i = 0; i < Capacity; ++i) {
            buffer[i].sequence.store(i, std::memory_order_relaxed);
        }
    }

    bool push(const T& data) {
        Cell* cell = nullptr;
        size_t pos = enqueue_pos.load(std::memory_order_relaxed);
        
        for (;;) {
            cell = &buffer[pos & MASK];
            size_t seq = cell->sequence.load(std::memory_order_acquire);
            intptr_t dif = static_cast<intptr_t>(seq) - static_cast<intptr_t>(pos);

            if (dif == 0) {
                if (enqueue_pos.compare_exchange_weak(pos, pos + 1, std::memory_order_relaxed)) {
                    break;
                }
            } else if (dif < 0) {
                return false; // Queue full
            } else {
                pos = enqueue_pos.load(std::memory_order_relaxed);
            }
        }

        cell->data = data;
        cell->sequence.store(pos + 1, std::memory_order_release);
        return true;
    }

    bool pop(T& data) {
        Cell* cell = nullptr;
        size_t pos = dequeue_pos.load(std::memory_order_relaxed);

        for (;;) {
            cell = &buffer[pos & MASK];
            size_t seq = cell->sequence.load(std::memory_order_acquire);
            intptr_t dif = static_cast<intptr_t>(seq) - static_cast<intptr_t>(pos + 1);

            if (dif == 0) {
                if (dequeue_pos.compare_exchange_weak(pos, pos + 1, std::memory_order_relaxed)) {
                    break;
                }
            } else if (dif < 0) {
                return false; // Queue empty
            } else {
                pos = dequeue_pos.load(std::memory_order_relaxed);
            }
        }

        data = cell->data;
        cell->sequence.store(pos + MASK + 1, std::memory_order_release);
        return true;
    }
};

} // namespace axiom::core
