#pragma once

#include "lexer.hpp"
#include "ast.hpp"
#include <vector>
#include <stdexcept>

namespace axiom::math {

class Parser {
    const std::vector<Token>& tokens;
    size_t pos;
    int depth;
    
    static constexpr int MAX_DEPTH = 64; // Anti-DoS Stack Overflow protection

    const Token& current() const {
        if (pos >= tokens.size()) return tokens.back(); // Should be End
        return tokens[pos];
    }

    void advance() {
        if (pos < tokens.size()) pos++;
    }

    void check_depth() {
        if (depth > MAX_DEPTH) {
            throw std::runtime_error("AST Parsing Error: Maximum recursion depth exceeded (Max 64). Potential DoS attempt.");
        }
    }

    std::unique_ptr<ASTNode> parse_expression() {
        depth++;
        check_depth();
        
        auto left = parse_term();
        
        while (current().type == TokenType::Plus || current().type == TokenType::Minus) {
            BinOp op = (current().type == TokenType::Plus) ? BinOp::Add : BinOp::Sub;
            advance();
            auto right = parse_term();
            left = std::make_unique<BinaryOpNode>(op, std::move(left), std::move(right));
        }
        
        depth--;
        return left;
    }

    std::unique_ptr<ASTNode> parse_term() {
        depth++;
        check_depth();
        
        auto left = parse_factor();
        
        while (current().type == TokenType::Multiply || current().type == TokenType::Divide) {
            BinOp op = (current().type == TokenType::Multiply) ? BinOp::Mul : BinOp::Div;
            advance();
            auto right = parse_factor();
            left = std::make_unique<BinaryOpNode>(op, std::move(left), std::move(right));
        }
        
        depth--;
        return left;
    }

    std::unique_ptr<ASTNode> parse_factor() {
        depth++;
        check_depth();
        
        auto left = parse_primary();
        
        if (current().type == TokenType::Power) {
            advance();
            auto right = parse_factor(); // Right associative
            left = std::make_unique<BinaryOpNode>(BinOp::Pow, std::move(left), std::move(right));
        }
        
        depth--;
        return left;
    }

    std::unique_ptr<ASTNode> parse_primary() {
        depth++;
        check_depth();
        
        Token t = current();
        
        if (t.type == TokenType::Number) {
            advance();
            depth--;
            return std::make_unique<NumberNode>(t.number_val);
        }
        else if (t.type == TokenType::Variable) {
            advance();
            depth--;
            return std::make_unique<VariableNode>(t.value);
        }
        else if (t.type == TokenType::Minus) {
            advance();
            auto operand = parse_primary();
            depth--;
            return std::make_unique<UnaryOpNode>(BinOp::Sub, std::move(operand));
        }
        else if (t.type == TokenType::ParenL) {
            advance();
            auto expr = parse_expression();
            if (current().type != TokenType::ParenR) {
                throw std::runtime_error("AST Parsing Error: Missing closing parenthesis.");
            }
            advance();
            depth--;
            return expr;
        }
        else if (t.type == TokenType::Function) {
            std::string func_name = t.value;
            advance();
            if (current().type != TokenType::ParenL) {
                throw std::runtime_error("AST Parsing Error: Expected '(' after function name.");
            }
            advance();
            auto expr = parse_expression();
            if (current().type != TokenType::ParenR) {
                throw std::runtime_error("AST Parsing Error: Missing closing parenthesis for function.");
            }
            advance();
            depth--;
            return std::make_unique<FunctionNode>(func_name, std::move(expr));
        }
        
        throw std::runtime_error("AST Parsing Error: Unexpected token '" + t.value + "'");
    }

public:
    Parser(const std::vector<Token>& t) : tokens(t), pos(0), depth(0) {}

    std::unique_ptr<ASTNode> parse() {
        if (tokens.empty() || tokens[0].type == TokenType::End) {
            return nullptr;
        }
        auto node = parse_expression();
        if (current().type != TokenType::End) {
            throw std::runtime_error("AST Parsing Error: Unexpected trailing tokens.");
        }
        return node;
    }
};

} // namespace axiom::math
