# MATH ENGINE & MATRICES

## 1. Linear Algebra Core
Математическое ядро не должно полагаться на стандартные абстракции, если они скрывают реальные аппаратные инструкции. 
Основная структура — 4x4 Матрица (для 3D проекций) и NxN тензоры (для абстрактной математики).

### 1.1 SIMD Matrix Multiplication (AVX2 / FMA3)
Умножение 4x4 матриц — критический путь. Мы используем Intrinsics (`<immintrin.h>`).
Алгоритм Broadcast & Fused Multiply-Add (FMA):

```cpp
#include <immintrin.h>

// Выровненная память (32 байта)
alignas(32) struct Matrix4x4 {
    float m[16];
};

inline void mat4_mul_avx(Matrix4x4* __restrict out, const Matrix4x4* __restrict a, const Matrix4x4* __restrict b) {
    // Загружаем строки матрицы B в AVX регистры
    __m256 row0 = _mm256_load_ps(&b->m[0]);
    __m256 row1 = _mm256_load_ps(&b->m[8]); // Предполагается 8x float (32 bytes), но для 4x4 матриц мы можем упаковать две 4x4 матрицы в 256-бит или использовать SSE для 4x4.
    // Если используем AVX (256 бит), мы можем считать сразу 2 матрицы 4x4.
}
```
*Note: Реальное умножение одиночной 4x4 матрицы выгоднее делать через SSE (__m128), а AVX использовать для умножения батчами (Batch Processing: умножение 1000 матриц на вектор одновременно).*

### 1.2 Differential Equations (ODE Solvers)
Для симуляции векторных полей (Vector Fields):
$$ \frac{dy}{dt} = f(t, y) $$
Используется метод Рунге-Кутта 4-го порядка (RK4):
- $k_1 = h \cdot f(t_n, y_n)$
- $k_2 = h \cdot f(t_n + \frac{h}{2}, y_n + \frac{k_1}{2})$
- $k_3 = h \cdot f(t_n + \frac{h}{2}, y_n + \frac{k_2}{2})$
- $k_4 = h \cdot f(t_n + h, y_n + k_3)$
- $y_{n+1} = y_n + \frac{1}{6}(k_1 + 2k_2 + 2k_3 + k_4)$

**Оптимизация**: Расчеты $k_1 \dots k_4$ векторизованы (SoA).

## 2. Topologies & Invariants
- **Eigenvalues (Собственные значения)**: Вычисляются через QR-алгоритм или метод Якоби для симметричных матриц.
- **SVD**: Для анализа трансформаций и визуализации главных осей деформации пространства.

### Math Verification Rule
Любое деление проверяется.
`float res = x / (y + 1e-8f);` (устранение сингулярностей). Векторы нормализуются с проверкой длины `if (len_sq > 1e-12f)`.
