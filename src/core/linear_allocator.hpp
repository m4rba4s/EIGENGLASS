#pragma once

#include <cstdint>
#include <cstddef>
#include <cstdlib>
#include <stdexcept>
#include <new>

namespace axiom::core {

class LinearAllocator {
private:
    uint8_t* start_ptr;
    size_t offset;
    size_t capacity;

    // Helper to calculate alignment padding
    static constexpr size_t calculate_padding(size_t current_address, size_t alignment) {
        size_t multiplier = (current_address / alignment) + 1;
        size_t aligned_address = multiplier * alignment;
        size_t padding = aligned_address - current_address;
        return (current_address % alignment == 0) ? 0 : padding;
    }

public:
    explicit LinearAllocator(size_t size_bytes) 
        : offset(0), capacity(size_bytes) {
        // We use aligned_alloc for the base block to guarantee 64-byte alignment
#if defined(_MSC_VER)
        start_ptr = static_cast<uint8_t*>(_aligned_malloc(size_bytes, 64));
#else
        start_ptr = static_cast<uint8_t*>(std::aligned_alloc(64, size_bytes));
#endif
        if (!start_ptr) {
            throw std::bad_alloc();
        }
    }

    ~LinearAllocator() {
#if defined(_MSC_VER)
        _aligned_free(start_ptr);
#else
        std::free(start_ptr);
#endif
    }

    // Delete copy/move semantics to prevent accidental dual-ownership of the arena
    LinearAllocator(const LinearAllocator&) = delete;
    LinearAllocator& operator=(const LinearAllocator&) = delete;

    void* allocate(size_t size, size_t alignment = 64) {
        size_t current_address = reinterpret_cast<size_t>(start_ptr) + offset;
        size_t padding = calculate_padding(current_address, alignment);

        if (offset + padding + size > capacity) {
            return nullptr; // Out of memory in this arena
        }

        size_t next_address = current_address + padding;
        offset += padding + size;

        return reinterpret_cast<void*>(next_address);
    }

    template <typename T, typename... Args>
    T* allocate_construct(Args&&... args) {
        void* mem = allocate(sizeof(T), alignof(T) > 64 ? alignof(T) : 64);
        if (!mem) return nullptr;
        return new (mem) T(std::forward<Args>(args)...); // placement new
    }

    void reset() {
        offset = 0;
    }

    size_t get_capacity() const { return capacity; }
    size_t get_used() const { return offset; }
};

} // namespace axiom::core
