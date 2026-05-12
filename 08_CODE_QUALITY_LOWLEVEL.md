# CODE QUALITY & LOW-LEVEL RULES (MARY_JANE PROTOCOL)

## 1. Anti-Vibecode Protocol
В проекте запрещены абстракции ради абстракций ("vibe-code"). 
Каждый интерфейс и каждая функция должны иметь доказуемую (измеримую) пользу.

- **Функции**: Soft-limit = 30 строк (LoC).
- **Cyclomatic Complexity**: $< 10$ ветвлений на функцию. Больше 10 = необходим рефакторинг или таблица переходов (Lookup Table).
- **Exceptions (Исключения)**: Полностью запрещены в математическом ядре и цикле рендеринга (hot-path). Обработка ошибок происходит через коды возврата (Return Codes) или типы `std::expected` / `Result<T, E>`. Исключения рушат branch-predictor процессора и усложняют контроль памяти.

## 2. Struct Layouts & Padding
Каждая структура данных (Struct) пишется с учетом padding (выравнивания).
```cpp
// ПЛОХО (24 bytes, 7 bytes padding):
struct BadParticle {
    char active;    // 1 byte
    // 3 bytes padding
    float x, y, z;  // 12 bytes
    char type;      // 1 byte
    // 7 bytes padding
};

// ХОРОШО (16 bytes, плотная упаковка):
struct GoodParticle {
    float x, y, z;  // 12 bytes
    char active;    // 1 byte
    char type;      // 1 byte
    char padding[2];// Явный контроль
};
```
*Note: Использование `static_assert` для проверки размера структур обязательно.*

## 3. Inline and Templates
- Ключевое слово `inline` или `__forceinline` обязательно для математических операторов `+`, `-`, `*`, `/` векторов и матриц.
- Шаблоны (Templates) используются строго для compile-time кодогенерации (например, развертка цикла умножения константных матриц), а не для "обобщения всего подряд". Метапрограммирование должно ускорять runtime, а не раздувать бинарник.
