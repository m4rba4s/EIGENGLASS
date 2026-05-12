cmake_minimum_required(VERSION 3.20)
project(AxiomEngine VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Optimization and warning flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Werror -O3 -march=native -mavx2")

# Memory sanitizers (optional but good for development)
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address")

include_directories(src)

# Core & Math library
add_library(axiom_core STATIC
    # src/core/linear_allocator.hpp (Header only for now)
    # src/math/matrix4x4.hpp        (Header only for now)
)

# Tests
enable_testing()
add_executable(math_tests tests/test_math.cpp)
target_link_libraries(math_tests axiom_core)

add_executable(math_ast_tests tests/test_ast.cpp)
target_link_libraries(math_ast_tests axiom_core)

# Add test target
add_test(NAME MathTests COMMAND math_tests)
add_test(NAME MathASTTests COMMAND math_ast_tests)
