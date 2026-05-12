# MEMORY & CACHE OPTIMIZATION

## 1. Cache-Line Engineering
Современные процессоры загружают память линиями (Cache Lines) по 64 байта. Любая структура данных должна быть спроектирована с учетом этого.
- Если мы читаем `float x` (4 байта), процессор загружает соседние 60 байт в L1 кэш.
- Чтобы не тратить кэш впустую, наши массивы (SoA) выравнены (Aligned). `alignas(64) float x[N];`

## 2. False Sharing Prevention
Если Поток 1 (Ядро 1) пишет в `x[0]`, а Поток 2 (Ядро 2) пишет в `x[1]`, они находятся в одной кэш-линии (64 байта). Это вызывает "Cache Coherency Ping-Pong" — кэш-линия постоянно инвалидируется и пересылается между ядрами по шине Ring Bus.
**Решение**: Чанки, раздаваемые потокам, должны быть кратны 64 байтам (т.е. 16 элементов `float`). Потоки никогда не пишут в соседние элементы одной кэш-линии.

## 3. Arena Allocators & Zero Allocations at Runtime
- `malloc` и `new` запрещены в горячих циклах расчета математики и рендера. Они не детерминированы (блокировки в куче ОС, O(n) поиск свободных блоков).
- **Паттерн Arena Allocator**:
  При старте: `void* memory_block = mmap(... size 1GB ...);`
  Все математические вектора и промежуточные буферы аллоцируются простым сдвигом указателя:
```cpp
class LinearAllocator {
    uint8_t* start;
    size_t offset;
    size_t capacity;
public:
    void* allocate(size_t size, size_t alignment = 64) {
        size_t padding = calculate_padding(start + offset, alignment);
        if (offset + padding + size > capacity) return nullptr; // OOM 
        void* ptr = start + offset + padding;
        offset += padding + size;
        return ptr;
    }
    void reset() { offset = 0; } // Сброс в начале каждого кадра (Frame)
};
```

## 4. Zero-Copy Architecture
Передача данных из Математического Ядра (CPU) на GPU осуществляется без копирования в staging-буферы, если GPU и CPU делят память (Unified Memory, APU) или через Persistent Mapped Buffers (Vulkan: `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT`). CPU пишет прямо в mapped-указатель.
