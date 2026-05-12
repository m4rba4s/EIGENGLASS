#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include "../src/core/linear_allocator.hpp"
#include "../src/math/simd_math.hpp"
#include "../src/math/matrix4x4.hpp"

using namespace axiom::core;
using namespace axiom::math;

TEST_CASE("LinearAllocator Alignment", "[core]") {
    LinearAllocator arena(1024);
    
    void* p1 = arena.allocate(15);
    void* p2 = arena.allocate(10);
    
    // Check 64-byte alignment
    REQUIRE(reinterpret_cast<size_t>(p1) % 64 == 0);
    REQUIRE(reinterpret_cast<size_t>(p2) % 64 == 0);
}

TEST_CASE("Matrix Multiplication Identity", "[math]") {
    Matrix4x4 id; // Default is identity
    Matrix4x4 other;
    
    // Set other to some values
    for (int i=0; i<16; ++i) other.m[i] = static_cast<float>(i);
    
    Matrix4x4 result = id * other;
    
    for (int i=0; i<16; ++i) {
        REQUIRE(result.m[i] == Approx(other.m[i]).epsilon(1e-5));
    }
}

TEST_CASE("Matrix Singularity", "[math]") {
    Matrix4x4 singular;
    // Fill with 1.0f -> det = 0
    for(int i=0; i<16; ++i) singular.m[i] = 1.0f;
    
    REQUIRE(singular.is_singular() == true);
    
    Matrix4x4 id;
    REQUIRE(id.is_singular() == false);
}

TEST_CASE("SIMD NaN Poisoning", "[math]") {
    alignas(32) float arr[16] = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f, 6.0f, 7.0f, 8.0f, 9.0f, 10.0f, 11.0f, 12.0f, 13.0f, 14.0f, 15.0f, 16.0f};
    REQUIRE(soa::check_nan_poisoning(arr, 16) == false);
    
    arr[5] = std::nanf(""); // Inject NaN
    REQUIRE(soa::check_nan_poisoning(arr, 16) == true);
}
