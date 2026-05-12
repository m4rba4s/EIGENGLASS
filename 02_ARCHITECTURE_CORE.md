# ARCHITECTURE CORE: AXIOM ENGINE

## 1. High-Level System Architecture
AXIOM строится на строгом разделении конвейеров. Система спроектирована так, чтобы минимизировать синхронизацию между потоками ввода (Input), вычислений (Sim/Math) и отрисовки (Render).

### Layers:
1. **Math/Compute Engine (CPU)**: Жесткий data-oriented слой. Вычисляет топологию, умножение матриц, ODE (Ordinary Differential Equations) интеграцию.
2. **Memory Manager**: Централизованное управление памятью. Pre-allocated блоки, разделенные на арены для каждого подсистемного цикла.
3. **Render Bridge (Vulkan API)**: Передача данных от CPU к GPU без лишних копий через mapped memory.
4. **Interactive Sandbox (UI/AST)**: Парсер пользовательских матричных выражений, конвертирующий их в байт-код или JIT-инструкции для Compute Engine.

## 2. Main Loop Pipeline
```text
[Frame Start] -> [Input Polling] -> [AST Parser / JIT] -> [Math Sim Thread Pool] -> [Wait/Sync] -> [GPU Command Buffer Upload] -> [Swapchain Present] -> [Frame End]
```

## 3. Data-Oriented Design (DOD) Rules
- **Нет глубокой иерархии объектов**: Никаких `class Vector3 : public MathObject`. 
- **SoA (Structure of Arrays)** вместо **AoS (Array of Structures)**:
  - *Плохо (AoS)*: `struct Particle { float x,y,z; float vx,vy,vz; }; Particle particles[1000];` (Cache miss rate высокий при обновлении только x-координаты).
  - *Хорошо (SoA)*: `struct ParticleSystem { float x[N], y[N], z[N], vx[N], vy[N], vz[N]; };` (Идеально для SIMD, загружаем 8 `x` в регистр AVX).

## 4. Complexity & Performance Budget
- **Target Frame Time**: 16.6ms (60 FPS) или 6.9ms (144 FPS).
- **Physics/Math Budget**: 4.0ms на такт.
- Если вычисления превышают лимит, применяется адаптивная деградация (снижение порядка аппроксимации в Рунге-Кутта или зменшение числа частиц).

## 5. Justification
Сложность введена исключительно для выжимания 100% утилизации L1/L2 кэша и FPU. Без этого симуляция 1M+ частиц в векторном поле с трансформацией нереальна в реальном времени.
