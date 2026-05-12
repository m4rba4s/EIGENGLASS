#pragma once

#include "simd_math.hpp"

namespace axiom::math {

struct alignas(32) Matrix4x4 {
    // Column-major order: columns are contiguous in memory.
    // Layout: [col0: m[0..3]] [col1: m[4..7]] [col2: m[8..11]] [col3: m[12..15]]
    float m[16];

    Matrix4x4() {
        for (int i = 0; i < 16; ++i) m[i] = 0.0f;
        m[0] = 1.0f; m[5] = 1.0f; m[10] = 1.0f; m[15] = 1.0f; // Identity
    }

    // Column-major SSE matrix multiply.
    // result_col[j] = A_col0 * B[0,j] + A_col1 * B[1,j] + A_col2 * B[2,j] + A_col3 * B[3,j]
    inline Matrix4x4 operator*(const Matrix4x4& other) const {
        Matrix4x4 result;
        const float* a = this->m;
        const float* b = other.m;
        float* out = result.m;

        __m128 a_col0 = _mm_load_ps(&a[0]);
        __m128 a_col1 = _mm_load_ps(&a[4]);
        __m128 a_col2 = _mm_load_ps(&a[8]);
        __m128 a_col3 = _mm_load_ps(&a[12]);

        for (int j = 0; j < 4; ++j) {
            __m128 bj0 = _mm_set1_ps(b[j * 4 + 0]);
            __m128 bj1 = _mm_set1_ps(b[j * 4 + 1]);
            __m128 bj2 = _mm_set1_ps(b[j * 4 + 2]);
            __m128 bj3 = _mm_set1_ps(b[j * 4 + 3]);

            __m128 r = _mm_add_ps(
                _mm_add_ps(_mm_mul_ps(a_col0, bj0), _mm_mul_ps(a_col1, bj1)),
                _mm_add_ps(_mm_mul_ps(a_col2, bj2), _mm_mul_ps(a_col3, bj3))
            );
            _mm_store_ps(&out[j * 4], r);
        }

        return result;
    }

    // Matrix-vector multiply: result = M * v (column-major)
    inline Vector4 transform(const Vector4& v) const {
        __m128 col0 = _mm_load_ps(&m[0]);
        __m128 col1 = _mm_load_ps(&m[4]);
        __m128 col2 = _mm_load_ps(&m[8]);
        __m128 col3 = _mm_load_ps(&m[12]);

        __m128 r = _mm_add_ps(
            _mm_add_ps(_mm_mul_ps(col0, _mm_set1_ps(v.x)), _mm_mul_ps(col1, _mm_set1_ps(v.y))),
            _mm_add_ps(_mm_mul_ps(col2, _mm_set1_ps(v.z)), _mm_mul_ps(col3, _mm_set1_ps(v.w)))
        );

        Vector4 result;
        result.store(r);
        return result;
    }

    // Cofactor-expansion determinant for 4x4 (column-major indexing)
    // col c, row r => m[c*4 + r]
    inline float determinant() const {
        // Laplace expansion along first row (r=0)
        float a00 = m[0], a10 = m[4], a20 = m[8],  a30 = m[12];
        float a01 = m[1], a11 = m[5], a21 = m[9],  a31 = m[13];
        float a02 = m[2], a12 = m[6], a22 = m[10], a32 = m[14];
        float a03 = m[3], a13 = m[7], a23 = m[11], a33 = m[15];

        float c0 = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
        float c1 = a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22);
        float c2 = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
        float c3 = a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12);

        return a00 * c0 - a10 * c1 + a20 * c2 - a30 * c3;
    }

    inline bool is_singular(float epsilon = 1e-6f) const {
        return std::abs(determinant()) < epsilon;
    }

    // Access element (row, col) in column-major
    float& at(int row, int col) { return m[col * 4 + row]; }
    const float& at(int row, int col) const { return m[col * 4 + row]; }
};

} // namespace axiom::math
