# AXIOM Engine — Полная Передача Проекта (Handoff Document)
# Для следующего AI-ассистента (Gemini / любая модель)

---

## 🔑 КРИТИЧЕСКИ ВАЖНО: ПРОЧИТАЙ ЭТО ПЕРВЫМ

Ты продолжаешь разработку **AXIOM: The Visual Calculus Engine** — высокопроизводительной визуальной лаборатории для студентов по линейной алгебре, матрицам и дифференциальным уравнениям.

**Проект НЕ начинается с нуля.** Уже реализовано 4 фазы. Ломать существующий код ЗАПРЕЩЕНО.

---

## 📁 СТРУКТУРА ПРОЕКТА

```text
/home/out/maths/MATRIXES/
│
├── 01_VISION_AND_PROMPT.md        — Мастер-промпт архитектуры (>3000 символов)
├── 02_ARCHITECTURE_CORE.md        — Pipeline и Data-Oriented Design
├── 03_MATH_ENGINE_MATRICES.md     — SIMD, RK4, тензоры
├── 04_CPU_CONCURRENCY.md          — Thread Pool, Lock-Free
├── 05_MEMORY_CACHE_OPTIMIZATION.md— Arena Allocator, Cache Lines
├── 06_VISUAL_RENDER_LAB.md        — GPU Compute, Ray Marching (план)
├── 07_PRACTICAL_DEV_LIFECYCLE.md  — CI, Build, Sanitizers
├── 08_CODE_QUALITY_LOWLEVEL.md    — Anti-vibecode, struct padding
├── 09_SECURITY_AND_BOUNDS.md      — Threat Model, NaN, DoS
│
├── CMakeLists.txt                 — C++20 build (g++ -O3 -march=native -mavx2)
│
├── src/
│   ├── core/
│   │   ├── linear_allocator.hpp   — Arena allocator, 64-byte aligned, zero-alloc hot path
│   │   ├── lock_free_queue.hpp    — Bounded MPMC queue (CAS, alignas(64), power-of-2)
│   │   └── thread_pool.hpp        — N-1 worker threads, spin-wait (_mm_pause)
│   └── math/
│       ├── simd_math.hpp          — Vector4 (alignas(32)), SoA add_arrays (AVX2), NaN detector
│       ├── matrix4x4.hpp          — Column-major 4x4, SSE multiply, det, transform(Vector4)
│       ├── lexer.hpp              — Tokenizer: числа, переменные, функции, операторы
│       ├── ast.hpp                — ASTNode hierarchy: Number, Variable, BinaryOp, Unary, Function
│       ├── parser.hpp             — Recursive descent, MAX_DEPTH=64 (anti-DoS)
│       └── evaluator.hpp          — Tree-walker, NaN на div/0, sqrt(<0)
│
├── tests/
│   ├── catch.hpp                  — Catch2 v2.13.10 (single header)
│   ├── test_math.cpp              — 22 assertions: alignment, mat*I, singularity, NaN detect
│   ├── test_concurrency.cpp       — 8 assertions: queue FIFO, 10K task stress test
│   └── test_ast.cpp               — 11 assertions: lexer, eval 2+2*2=6, anti-DoS depth, div/0→NaN
│
└── web/
    ├── index.html                 — Semantic HTML5, three-panel layout, SEO meta
    ├── style.css                  — Dark-space theme, glassmorphism, JetBrains Mono + Inter
    └── engine.js                  — Canvas 2D renderer: transforms, eigenvectors, vector fields
```

---

## ✅ ЧТО УЖЕ РЕАЛИЗОВАНО (НЕ ТРОГАТЬ БЕЗ НЕОБХОДИМОСТИ)

| Фаза | Статус | Что сделано |
|------|--------|-------------|
| **Phase 1: Memory & Math** | ✅ DONE | LinearAllocator (64B align), Matrix4x4 SSE mul, SoA AVX2 ops, NaN detection |
| **Phase 2: Concurrency** | ✅ DONE | Lock-Free MPMC Queue (CAS), ThreadPool (spin-wait), stress-tested 10K tasks |
| **Phase 3: AST Parser** | ✅ DONE | Lexer→Parser→Evaluator pipeline, MAX_DEPTH=64, div/0→NaN, sin/cos/tan/sqrt |
| **Phase 4: Web Visualizer** | ✅ DONE | 3 режима (Transform/Eigen/VectorField), animation, HUD telemetry, presets |
| **Phase 5: 3D WebGL** | ✅ DONE | Нативный WebGL, 3D сетка, orbit камера, mat4 библиотека |
| **Phase 6: Attractors** | ✅ DONE | RK4 интегратор (JS), Аттрактор Лоренца, GL_LINE_STRIP динамический буфер |
| **Phase 8: Pedagogy** | ✅ DONE | Drag-and-drop векторов, Singularity glitch, NaN poisoning exploit |

**Все тесты проходят:**
```bash
# Запуск тестов (из /home/out/maths/MATRIXES):
g++ -std=c++20 -O3 -march=native -mavx2 -Wall -Wextra tests/test_math.cpp -o math_tests && ./math_tests
g++ -std=c++20 -O3 -pthread -Wall -Wextra tests/test_concurrency.cpp -o concurrency_tests && ./concurrency_tests
g++ -std=c++20 -O3 -Wall -Wextra tests/test_ast.cpp -o math_ast_tests && ./math_ast_tests
```

---

## 🚫 ЖЁСТКИЕ ПРАВИЛА КОДИРОВАНИЯ (ОБЯЗАТЕЛЬНО)

### C++ Backend

1. **Стандарт**: C++20. Флаги: `-Wall -Wextra -Werror -O3 -march=native -mavx2`
2. **Никаких `new`/`malloc` в горячих циклах** (render loop, math loop). Используй `LinearAllocator`.
3. **Никаких `std::mutex` в горячих циклах**. Используй `LockFreeQueue` и атомики.
4. **SoA вместо AoS** для массивных вычислений (>1000 элементов).
5. **Выравнивание**: `alignas(32)` для SIMD-структур, `alignas(64)` для атомиков (false sharing prevention).
6. **Функции**: soft-limit 30 строк, cyclomatic complexity < 10.
7. **Нет виртуальных вызовов (virtual)** в горячих циклах — vtable lookup дорогой.
8. **Нет exceptions** в math/render ядре. Используй `return nullptr`, `std::expected`, или коды ошибок.
9. **Каждое деление** проверяется: `if (abs(divisor) < 1e-12f) return NaN`.
10. **static_assert** на размеры структур для контроля padding.
11. **Тесты обязательны** для любого нового модуля. Фреймворк: Catch2 (`tests/catch.hpp`).

### Web Frontend (JavaScript)

1. **Vanilla JS** — никаких фреймворков (React/Vue/etc). Canvas 2D API.
2. **Шрифты**: JetBrains Mono (код/числа), Inter (UI текст). Уже подключены через Google Fonts.
3. **CSS Variables**: Все цвета/размеры определены в `:root` в `style.css`. Используй их, не хардкодь цвета.
4. **Тема**: Dark-space (bg: `#0a0e17`). Акценты: cyan `#22d3ee`, blue `#3b82f6`, violet `#8b5cf6`, amber `#f59e0b`, red `#ef4444`.
5. **IIFE**: Весь код обёрнут в `(function() { 'use strict'; ... })();`. Глобальные переменные запрещены.
6. **DPR-aware Canvas**: Всегда учитывай `devicePixelRatio` при `resizeCanvas()`.
7. **NaN/Infinity checks**: Любой результат пользовательской формулы проверяется через `isNaN()` и `isFinite()`.
8. **Координатная система**: `worldToScreen()` и `screenToWorld()` — единственные функции конвертации. Не хардкодь пиксельные координаты.

### Общие правила

1. **Column-major** порядок матриц (совместимость с OpenGL/Vulkan). `m[col*4 + row]`.
2. **Комментарии**: Не удаляй существующие комментарии. Добавляй свои к новому коду.
3. **Файлы документации** (01-09_*.md): Read-only. Не изменяй без явного запроса пользователя.
4. **namespace**: C++ — `axiom::core` и `axiom::math`. Не создавай другие без причины.

---

## 🗺️ ROADMAP: ЧТО НУЖНО ДЕЛАТЬ ДАЛЬШЕ

### Phase 5: 3D Visualization (WebGL)
- Расширить `engine.js` поддержкой WebGL для 3D матриц (3×3)
- Трёхмерная сетка + трансформация + базисные векторы в 3D
- Камера с orbit-контролом (drag для вращения)

### Phase 6: Аттракторы и ODE
- Реализовать Runge-Kutta 4 (RK4) интегратор в JS (зеркалируя C++ из doc 03)
- Пресеты: аттрактор Лоренца, Рёсслера, маятник
- Ползунок времени "Time Travel" (симплектический интегратор для обратимости)

### Phase 7: WebAssembly Bridge (SKIPPED - No emcc)
- Скомпилировать C++ ядро (src/math/*) в WASM через Emscripten
- JS вызывает C++ для тяжёлых вычислений (SVD, eigendecomposition NxN)
- Бенчмарк: JS vs WASM скорость умножения матриц

### Phase 8: Exploit-based Pedagogy (✅ DONE)
- "Сломай математику": визуальные эффекты при сингулярных матрицах (чёрная дыра shader)
- NaN Poisoning cascade animation
- Drag-and-drop базисных векторов (студент тянет î мышкой, матрица обновляется)

### Phase 9: Telemetry Deep Dive
- Показывать Cache Hit/Miss rate (симулированный)
- Сравнение AoS vs SoA скорости (визуальный toggle)
- GFLOPS counter

---

## ⚠️ ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ

1. **cmake** не установлен в текущем окружении. Компилировать напрямую через `g++`.
2. **ThreadSanitizer (TSan)** недоступен (`libtsan.so` отсутствует). Используй стресс-тесты вместо TSan.
3. **Vulkan/OpenGL** не доступны — нет GPU в среде. Вся визуализация через Canvas 2D (web/).
4. **Catch2 v2** (single header). Не обновляй до v3 без необходимости — ломает API.

---

## 🔧 КАК ДОБАВЛЯТЬ НОВЫЙ МОДУЛЬ

```
1. Создай header в src/math/ или src/core/
2. Напиши тест в tests/test_<name>.cpp
3. Скомпилируй: g++ -std=c++20 -O3 -march=native -mavx2 -Wall -Wextra tests/test_<name>.cpp -o test_<name> && ./test_<name>
4. Если модуль для веба — добавь функционал в web/engine.js
5. Обнови CMakeLists.txt (add_executable + add_test)
```

---

## 📊 МАТЕМАТИЧЕСКИЕ ИНВАРИАНТЫ ДЛЯ ТЕСТОВ

| Проверка | Формула | Epsilon |
|----------|---------|---------|
| Identity multiply | `I * A == A` | `1e-5` |
| Determinant identity | `det(I) == 1` | `1e-6` |
| Singular matrix | `det(all_ones) == 0` | `1e-6` |
| Eigenvalue trace | `λ₁ + λ₂ == trace(A)` | `1e-5` |
| Eigenvalue det | `λ₁ * λ₂ == det(A)` | `1e-5` |
| Operator precedence | `2 + 2 * 2 == 6` | exact |
| AST depth protection | `depth > 64 → throw` | N/A |
| Division by zero | `1/0 → NaN` | `isnan()` |

---

*Документ создан: Claude Opus 4.6 (Thinking) — 2026-05-12*
*Предыдущие фазы: Gemini 3.1 Pro (Phases 1-3), Claude Opus 4.6 (Phase 4 + Bug Fix), Antigravity (Phases 5-8)*
