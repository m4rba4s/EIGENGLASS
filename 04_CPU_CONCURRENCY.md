# CPU CONCURRENCY & MULTITHREADING

## 1. Philosophy
The concurrency model is designed to minimize thread suspension (context switching) and eliminate lock contention. 
Rule: **Zero mutexes in the mathematical hot-path.**

## 2. Thread Pool & Work-Stealing
- **Topology**: При старте движок запрашивает у OS (через `hwloc` или платформозависимые API) количество физических ядер (Physical Cores) и NUMA-нод.
- **Worker Threads**: Создается ровно $N_{cores} - 1$ рабочих потоков (Worker Threads). Один поток (Main) оркестрирует.
- **Pinning**: Потоки "прибиваются" к конкретным ядрам (`pthread_setaffinity_np` в Linux) для предотвращения миграции потоков ОС-планировщиком, что убивает кэш L1/L2.

## 3. Lock-Free Task Queue
Задачи распределяются через Lock-Free MPMC (Multi-Producer, Multi-Consumer) очереди (например, на основе кольцевого буфера Бьюффа).

```cpp
#include <atomic>

struct Task {
    void (*execute)(void*);
    void* data;
};

class LockFreeQueue {
    std::atomic<size_t> head_{0};
    std::atomic<size_t> tail_{0};
    Task buffer[1024]; // power of 2 for fast modulo
public:
    bool push(const Task& t) {
        // atomic compare-and-swap logic
    }
    // ...
};
```

## 4. Data Partitioning for Matrix Ops
Если у нас есть массив из 1,000,000 частиц для трансформации через Матрицу Якоби:
- Массив делится на чанки (Chunks) по `N = 1,000,000 / Threads`.
- Размер чанка должен быть кратен размеру кэш-линии (64 bytes), чтобы избежать False Sharing.
- Каждый поток берет свой чанк, префетчит данные (`__builtin_prefetch`) и перемножает батчами через SIMD.

## 5. Synchronization
В конце кадра (Frame End) используется `std::binary_semaphore` или Spin-Lock (с `_mm_pause()`) для ожидания завершения всех задач (Barrier Sync). Spin-lock применяется только если ожидание $< 10$ микросекунд, иначе поток уходит в sleep (yield).
