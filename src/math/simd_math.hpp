#pragma once

#include <immintrin.h>
#include <cmath>

namespace axiom::math {

// 32-byte aligned structures for AVX2
struct alignas(32) Vector4 {
    float x, y, z, w;

    Vector4() : x(0), y(0), z(0), w(0) {}
    Vector4(float _x, float _y, float _z, float _w) : x(_x), y(_y), z(_z), w(_w) {}

    // Load into AVX register (we'll just use SSE for single Vector4, AVX is better for SoA)
    // Here we provide __m128 for single 4-element vectors
    __m128 load() const {
        return _mm_load_ps(&x);
    }

    void store(__m128 v) {
        _mm_store_ps(&x, v);
    }
};

// Utilities for SoA (Structure of Arrays) processing
namespace soa {
    // Adds two arrays of floats using AVX2. Arrays must be 32-byte aligned.
    // count must be a multiple of 8.
    inline void add_arrays(float* __restrict out, const float* __restrict a, const float* __restrict b, size_t count) {
        for (size_t i = 0; i < count; i += 8) {
            __m256 va = _mm256_load_ps(&a[i]);
            __m256 vb = _mm256_load_ps(&b[i]);
            __m256 vres = _mm256_add_ps(va, vb);
            _mm256_store_ps(&out[i], vres);
        }
    }
    
    // Checks an array for NaN to detect poisoning
    inline bool check_nan_poisoning(const float* arr, size_t count) {
        for (size_t i = 0; i < count; i += 8) {
            __m256 v = _mm256_load_ps(&arr[i]);
            // Compare v with itself to check for NaN (NaN != NaN)
            __m256 cmp = _mm256_cmp_ps(v, v, _CMP_NEQ_UQ);
            int mask = _mm256_movemask_ps(cmp);
            if (mask != 0) {
                return true; // NaN detected
            }
        }
        return false;
    }
}

} // namespace axiom::math
