#pragma once

#include "ast.hpp"
#include <unordered_map>
#include <cmath>
#include <stdexcept>

namespace axiom::math {

class Evaluator {
public:
    static float evaluate(const ASTNode* node, const std::unordered_map<std::string, float>& vars = {}) {
        if (!node) return 0.0f;

        switch (node->type) {
            case ASTNodeType::Number: {
                return static_cast<const NumberNode*>(node)->value;
            }
            case ASTNodeType::Variable: {
                const auto* vnode = static_cast<const VariableNode*>(node);
                auto it = vars.find(vnode->name);
                if (it == vars.end()) {
                    throw std::runtime_error("Eval Error: Unknown variable '" + vnode->name + "'");
                }
                return it->second;
            }
            case ASTNodeType::BinaryOp: {
                const auto* bnode = static_cast<const BinaryOpNode*>(node);
                float left = evaluate(bnode->left.get(), vars);
                float right = evaluate(bnode->right.get(), vars);
                
                switch (bnode->op) {
                    case BinOp::Add: return left + right;
                    case BinOp::Sub: return left - right;
                    case BinOp::Mul: return left * right;
                    case BinOp::Div: 
                        if (std::abs(right) < 1e-12f) return std::nanf(""); // Protect division by zero
                        return left / right;
                    case BinOp::Pow: return std::pow(left, right);
                }
                break;
            }
            case ASTNodeType::UnaryOp: {
                const auto* unode = static_cast<const UnaryOpNode*>(node);
                float val = evaluate(unode->operand.get(), vars);
                if (unode->op == BinOp::Sub) return -val;
                return val;
            }
            case ASTNodeType::Function: {
                const auto* fnode = static_cast<const FunctionNode*>(node);
                float arg = evaluate(fnode->argument.get(), vars);
                
                if (fnode->func_name == "sin") return std::sin(arg);
                if (fnode->func_name == "cos") return std::cos(arg);
                if (fnode->func_name == "tan") return std::tan(arg);
                if (fnode->func_name == "sqrt") {
                    if (arg < 0.0f) return std::nanf(""); // Domain error
                    return std::sqrt(arg);
                }
                throw std::runtime_error("Eval Error: Unknown function '" + fnode->func_name + "'");
            }
        }
        return 0.0f;
    }
};

} // namespace axiom::math
