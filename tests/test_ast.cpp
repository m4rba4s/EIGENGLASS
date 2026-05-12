#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include "../src/math/lexer.hpp"
#include "../src/math/parser.hpp"
#include "../src/math/evaluator.hpp"

using namespace axiom::math;

TEST_CASE("Lexer Tokenization", "[ast]") {
    auto tokens = Lexer::tokenize("sin(x) + 2.5 * y^2");
    
    REQUIRE(tokens.size() == 11);
    REQUIRE(tokens[0].type == TokenType::Function);
    REQUIRE(tokens[0].value == "sin");
    
    REQUIRE(tokens[2].type == TokenType::Variable);
    REQUIRE(tokens[2].value == "x");
    
    REQUIRE(tokens[5].type == TokenType::Number);
    REQUIRE(tokens[5].number_val == Approx(2.5f));
}

TEST_CASE("AST Evaluation Basics", "[ast]") {
    auto tokens = Lexer::tokenize("2 + 2 * 2");
    Parser parser(tokens);
    auto ast = parser.parse();
    
    float result = Evaluator::evaluate(ast.get());
    REQUIRE(result == Approx(6.0f));
}

TEST_CASE("AST Evaluation with Variables and Functions", "[ast]") {
    auto tokens = Lexer::tokenize("sin(x) + y^2");
    Parser parser(tokens);
    auto ast = parser.parse();
    
    std::unordered_map<std::string, float> vars = {
        {"x", 0.0f}, // sin(0) = 0
        {"y", 3.0f}  // 3^2 = 9
    };
    
    float result = Evaluator::evaluate(ast.get(), vars);
    REQUIRE(result == Approx(9.0f));
}

TEST_CASE("Anti-DoS Protection (Max Depth)", "[ast]") {
    // Generate a deep nested string: (((...(1)...)))
    std::string attack_str = "";
    for (int i=0; i<70; ++i) attack_str += "(";
    attack_str += "1";
    for (int i=0; i<70; ++i) attack_str += ")";
    
    auto tokens = Lexer::tokenize(attack_str);
    Parser parser(tokens);
    
    // Should throw runtime_error due to exceeding Max Depth of 64
    REQUIRE_THROWS_AS(parser.parse(), std::runtime_error);
}

TEST_CASE("Division by Zero to NaN Poisoning", "[ast]") {
    auto tokens = Lexer::tokenize("1 / 0");
    Parser parser(tokens);
    auto ast = parser.parse();
    
    float result = Evaluator::evaluate(ast.get());
    REQUIRE(std::isnan(result));
}
