#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include <cctype>

namespace axiom::math {

enum class TokenType {
    Number,
    Variable,
    Function, // sin, cos, etc
    Plus,
    Minus,
    Multiply,
    Divide,
    Power,
    ParenL,
    ParenR,
    End
};

struct Token {
    TokenType type;
    std::string value; // Stores "x", "sin", or the string of the number
    float number_val = 0.0f; // Only valid if type == Number
};

class Lexer {
public:
    static std::vector<Token> tokenize(const std::string& input) {
        std::vector<Token> tokens;
        size_t i = 0;

        while (i < input.length()) {
            char c = input[i];

            if (std::isspace(c)) {
                i++;
                continue;
            }

            if (std::isalpha(c)) {
                std::string word;
                while (i < input.length() && std::isalpha(input[i])) {
                    word += input[i];
                    i++;
                }
                
                if (word == "sin" || word == "cos" || word == "tan" || word == "sqrt") {
                    tokens.push_back({TokenType::Function, word, 0.0f});
                } else {
                    tokens.push_back({TokenType::Variable, word, 0.0f});
                }
                continue;
            }

            if (std::isdigit(c) || c == '.') {
                std::string num_str;
                while (i < input.length() && (std::isdigit(input[i]) || input[i] == '.')) {
                    num_str += input[i];
                    i++;
                }
                float val = std::stof(num_str);
                tokens.push_back({TokenType::Number, num_str, val});
                continue;
            }

            switch (c) {
                case '+': tokens.push_back({TokenType::Plus, "+", 0.0f}); break;
                case '-': tokens.push_back({TokenType::Minus, "-", 0.0f}); break;
                case '*': tokens.push_back({TokenType::Multiply, "*", 0.0f}); break;
                case '/': tokens.push_back({TokenType::Divide, "/", 0.0f}); break;
                case '^': tokens.push_back({TokenType::Power, "^", 0.0f}); break;
                case '(': tokens.push_back({TokenType::ParenL, "(", 0.0f}); break;
                case ')': tokens.push_back({TokenType::ParenR, ")", 0.0f}); break;
                default: throw std::runtime_error(std::string("Unknown character in formula: ") + c);
            }
            i++;
        }
        tokens.push_back({TokenType::End, "", 0.0f});
        return tokens;
    }
};

} // namespace axiom::math
