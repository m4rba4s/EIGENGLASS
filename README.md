# ◈ EIGENGLASS — Linear Algebra & Chaos Laboratory

**An interactive, hardware-aware mathematical laboratory for exploring linear algebra, chaos theory, and differential equations.**

[![C++20](https://img.shields.io/badge/C%2B%2B-20-00599C?logo=cplusplus&logoColor=white)](https://en.cppreference.com/w/cpp/20)
[![SIMD](https://img.shields.io/badge/SIMD-AVX2%20%2F%20SSE4.2-FF6F00)](https://www.intel.com/content/www/us/en/docs/intrinsics-guide/index.html)
[![WebGL](https://img.shields.io/badge/WebGL-Native-990000?logo=webgl&logoColor=white)](https://www.khronos.org/webgl/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22d3ee.svg)](LICENSE)

*Built from scratch. No frameworks. No dependencies. Just math, metal, and pixels.*

---

## What is EIGENGLASS?

EIGENGLASS bridges the gap between **abstract mathematics** and **low-level hardware execution**. It's a dual-layer engine:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Compute Core** | C++20, SIMD (AVX2/SSE), Lock-Free Queues, Arena Allocators | High-performance numerical computation |
| **Visual Lab** | Vanilla JS, Canvas 2D, Native WebGL (no libraries) | Interactive real-time visualization |

Students don't just *read* about eigenvalues — they **drag basis vectors with their mouse** and watch the matrix update. They don't just *hear* about numerical instability — they **inject NaN into the pipeline** and watch it cascade-destroy the coordinate grid.

---

##  Features

###  2D Matrix Transforms
- Interactive 2×2 matrix with real-time grid deformation
- **Drag-and-drop basis vectors** (î, ĵ) — the matrix is the columns
- Live determinant, trace, eigenvalue computation
- Smooth animation with interpolation slider (I → A)

### λ Eigenanalysis
- Real-time eigenvector/eigenvalue overlay
- Visual proof: eigenvectors stay on their span under transformation
- Complex eigenvalue detection (rotation matrices)

###  Vector Fields
- Custom formula input: `dx/dt = f(x, y, t)`
- 800 flowing particles tracing the ODE
- NaN-safe evaluation with red poison indicators

###  3D Space (WebGL)
- Full 3×3 matrix transforms in 3D
- Hand-written mat4 library (perspective, lookAt, multiply)
- Orbit camera (mouse drag + scroll zoom)
- Dual-plane grid (XZ ground + XY wall)

###  Lorenz Attractor (RK4)
- **Runge-Kutta 4th order** ODE integrator
- Real-time 3D butterfly trace with up to 10,000 points
- Adjustable parameters: σ (Prandtl), ρ (Rayleigh), β
- Dynamic WebGL `LINE_STRIP` rendering with Z-based color gradient

### ☠ Exploit-Based Pedagogy
- **NaN Poisoning**: Inject `NaN` into the matrix → watch the entire render pipeline collapse into red glitch chaos
- **Singularity Shake**: When det(A) → 0, the grid trembles as dimensions collapse
- **Interactive Recovery**: Drag vectors to fix the poisoned state

---

##  Architecture

```
EIGENGLASS Engine
├── C++ Compute Core (src/)
│   ├── math/
│   │   ├── simd_math.hpp      ── AVX2 SoA vector ops, NaN detector
│   │   ├── matrix4x4.hpp      ── SSE 4×4 multiply, determinant
│   │   ├── lexer.hpp           ── Formula tokenizer
│   │   ├── parser.hpp          ── Recursive descent (depth-limited)
│   │   └── evaluator.hpp       ── Tree-walk eval, div/0 → NaN
│   └── core/
│       ├── linear_allocator.hpp ── Arena allocator (64B aligned)
│       ├── lock_free_queue.hpp  ── MPMC CAS queue (power-of-2)
│       └── thread_pool.hpp      ── N-1 workers, _mm_pause spin
│
├── Visual Lab (web/)
│   ├── engine.js    ── 2D Canvas renderer + RK4 integrator
│   ├── webgl.js     ── Native WebGL 3D engine
│   ├── style.css    ── Dark-space design system
│   └── index.html   ── Semantic HTML5 layout
│
└── Tests (tests/)
    ├── test_math.cpp         ── 22 assertions (SIMD, matrix, NaN)
    ├── test_concurrency.cpp  ── 8 assertions (queue, 10K stress)
    └── test_ast.cpp          ── 11 assertions (parser, eval, DoS)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No `new`/`malloc` in hot loops** | Arena allocator eliminates allocation jitter |
| **No `std::mutex`** | Lock-free CAS queues for zero-contention concurrency |
| **SoA over AoS** | Cache-line optimization for SIMD batch processing |
| **Column-major matrices** | OpenGL/Vulkan compatibility |
| **No JS frameworks** | Zero dependencies, total control, ~32KB total |
| **`alignas(64)` on atomics** | Prevents false sharing across cache lines |

---

## 🚀 Quick Start

### Run the Visual Lab (no build required)
```bash
# Just open the HTML file in any modern browser
open web/index.html
# Or serve it
python3 -m http.server 8080 --directory web/
```

### Build & Test the C++ Core
```bash
# Compile tests (requires g++ with C++20 and AVX2 support)
g++ -std=c++20 -O3 -march=native -mavx2 -Wall -Wextra \
    tests/test_math.cpp -o test_math && ./test_math

g++ -std=c++20 -O3 -pthread -Wall -Wextra \
    tests/test_concurrency.cpp -o test_concurrency && ./test_concurrency

g++ -std=c++20 -O3 -Wall -Wextra \
    tests/test_ast.cpp -o test_ast && ./test_ast
```

All **41 assertions** across 11 test cases pass.

---

##  The Math

### RK4 Integration (Lorenz System)

The attractor module solves the Lorenz system using classical 4th-order Runge-Kutta:

$$\frac{dx}{dt} = \sigma(y - x), \quad \frac{dy}{dt} = x(\rho - z) - y, \quad \frac{dz}{dt} = xy - \beta z$$

With default parameters $\sigma = 10$, $\rho = 28$, $\beta = 8/3$, this produces the famous butterfly attractor — a canonical example of deterministic chaos where trajectories never repeat.

### Eigendecomposition (2×2)

For matrix $A$, eigenvalues are computed analytically:

$$\lambda_{1,2} = \frac{\text{tr}(A) \pm \sqrt{\text{tr}(A)^2 - 4\det(A)}}{2}$$

The discriminant determines the nature: real (node/saddle) vs. complex (spiral/center).

### NaN Propagation Model

EIGENGLASS demonstrates IEEE 754 arithmetic's poison property: any operation involving NaN produces NaN. One corrupted matrix element instantly destroys all downstream computations — grid points, basis vectors, eigenvalues — creating a cascade failure visible in real-time.

---

##  Testing Invariants

| Test | Assertion | Tolerance |
|------|-----------|-----------|
| `I × A = A` | Identity multiplication | `ε < 1e-5` |
| `det(I) = 1` | Identity determinant | `ε < 1e-6` |
| `det(singular) = 0` | Singularity detection | `ε < 1e-6` |
| `λ₁ + λ₂ = tr(A)` | Eigenvalue-trace relation | `ε < 1e-5` |
| `λ₁ · λ₂ = det(A)` | Eigenvalue-determinant relation | `ε < 1e-5` |
| `2 + 2 × 2 = 6` | Operator precedence | exact |
| `depth > 64` | Anti-DoS recursion limit | throws |
| `1/0 → NaN` | Division by zero handling | `isnan()` |

---

##  Tech Stack

- **C++20** — Concepts, constexpr, structured bindings
- **SIMD** — AVX2 (`_mm256_*`) for SoA batch ops, SSE4.2 for matrix multiply
- **Lock-Free** — `std::atomic` CAS with `memory_order_acq_rel`
- **WebGL 1.0** — Raw shaders, no gl-matrix, hand-rolled perspective/lookAt
- **Canvas 2D** — Hardware-accelerated 2D rendering at 60 FPS
- **Catch2 v2** — Single-header test framework

---

##  Documentation

The `docs/` directory contains 9 detailed design documents:

| Doc | Topic |
|-----|-------|
| `01_VISION_AND_PROMPT.md` | Master architecture prompt |
| `02_ARCHITECTURE_CORE.md` | Pipeline & Data-Oriented Design |
| `03_MATH_ENGINE_MATRICES.md` | SIMD strategy, RK4, tensor layout |
| `04_CPU_CONCURRENCY.md` | Thread pool, lock-free patterns |
| `05_MEMORY_CACHE_OPTIMIZATION.md` | Arena allocator, cache lines |
| `06_VISUAL_RENDER_LAB.md` | Rendering pipeline design |
| `07_PRACTICAL_DEV_LIFECYCLE.md` | CI, build system, sanitizers |
| `08_CODE_QUALITY_LOWLEVEL.md` | Anti-vibecode, struct padding |
| `09_SECURITY_AND_BOUNDS.md` | Threat model, NaN, DoS protection |

---

##  Roadmap

- [x] **Phase 1** — Memory & SIMD Math Core
- [x] **Phase 2** — Lock-Free Concurrency
- [x] **Phase 3** — AST Formula Parser
- [x] **Phase 4** — Interactive 2D Web Visualizer
- [x] **Phase 5** — Native WebGL 3D Engine
- [x] **Phase 6** — Lorenz Attractor (RK4 ODE)
- [ ] **Phase 7** — WebAssembly Bridge (C++ → WASM)
- [x] **Phase 8** — Exploit-Based Pedagogy
- [ ] **Phase 9** — Telemetry Deep Dive (GFLOPS, cache sim)

---

##  License

MIT — do whatever you want, just keep the math correct.

---


*Built with obsessive attention to detail by researchers who believe*
*the best way to understand mathematics is to break it.*

**◈ EIGENGLASS** — *Where linear algebra meets bare metal.*

