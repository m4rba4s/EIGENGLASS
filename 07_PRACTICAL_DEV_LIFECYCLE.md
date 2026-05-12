# PRACTICAL DEVELOPMENT LIFECYCLE

## 1. Build System & Environments
Проект использует строгий **CMake (C++)** или **Cargo (Rust)** профиль.
Для C++:
```cmake
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_FLAGS "-Wall -Wextra -Werror -O3 -march=native -ffast-math")
```
*-ffast-math применяется только для модулей симуляции (где не важна строгая IEEE-754 точность NaN/Inf обработки ради 2x ускорения SIMD). Для критических аналитических расчетов fast-math отключается.*

## 2. Continuous Integration Quality Gates
Любой PR (Pull Request) обязан пройти 4 барьера:
1. **Linter & Formatting**: `clang-format` и `clang-tidy` (никаких отступлений).
2. **Unit Tests (Math Correctness)**: Catch2 / GoogleTest. Проверка умножения матриц на эталонных примерах (NumPy output). Точность (Epsilon) $< 10^{-5}$.
3. **Performance Regression Tests**: Использование Google Benchmark. Если throughput умножения матриц падает более чем на 5% — билд реджектится.
4. **Sanitizers**: 
   - `ASan (Address Sanitizer)`: ловит утечки и out-of-bounds.
   - `TSan (Thread Sanitizer)`: ловит data-races в нашем Work-Stealing Pool.
   - `UBSan (Undefined Behavior Sanitizer)`.

## 3. Directory Structure
```text
/src
  /math       -> Вектора, Матрицы, SIMD интринсики, ODE солверы
  /core       -> Memory Allocators, Thread Pool, Запуск
  /render     -> Vulkan контекст, Шейдеры (GLSL/HLSL)
  /ui         -> AST парсер формул, ImGui оверлей
/tests
  /math_tests -> Проверки алгебры
  /perf_tests -> Бенчмарки кэша и многопотока
/scripts      -> Python скрипты (для генерации эталонных матриц)
```

## 4. Workflow Rules
- Обязательное ревью кода: фокус на сложность ветвлений (branch predictors) и работу с памятью.
- No dynamic dispatch (virtual functions) in hot loops (vtable lookup cost is too high).
- Разработка ведется "сначала данные, потом логика" (Data-First).
