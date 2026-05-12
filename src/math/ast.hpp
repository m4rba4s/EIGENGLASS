#pragma once

#include <string>
#include <memory>

namespace axiom::math {

enum class ASTNodeType {
    Number,
    Variable,
    BinaryOp,
    UnaryOp,
    Function
};

// We use basic polymorphism for simplicity in AST walking.
// In a highly optimized iteration, this would be a flattened array of unions (bytecode).
struct ASTNode {
    ASTNodeType type;
    virtual ~ASTNode() = default;
    
    ASTNode(ASTNodeType t) : type(t) {}
};

struct NumberNode : public ASTNode {
    float value;
    NumberNode(float val) : ASTNode(ASTNodeType::Number), value(val) {}
};

struct VariableNode : public ASTNode {
    std::string name;
    VariableNode(const std::string& n) : ASTNode(ASTNodeType::Variable), name(n) {}
};

enum class BinOp {
    Add, Sub, Mul, Div, Pow
};

struct BinaryOpNode : public ASTNode {
    BinOp op;
    std::unique_ptr<ASTNode> left;
    std::unique_ptr<ASTNode> right;
    
    BinaryOpNode(BinOp o, std::unique_ptr<ASTNode> l, std::unique_ptr<ASTNode> r)
        : ASTNode(ASTNodeType::BinaryOp), op(o), left(std::move(l)), right(std::move(r)) {}
};

struct UnaryOpNode : public ASTNode {
    BinOp op; // Usually just Sub (-)
    std::unique_ptr<ASTNode> operand;
    
    UnaryOpNode(BinOp o, std::unique_ptr<ASTNode> operand)
        : ASTNode(ASTNodeType::UnaryOp), op(o), operand(std::move(operand)) {}
};

struct FunctionNode : public ASTNode {
    std::string func_name;
    std::unique_ptr<ASTNode> argument;
    
    FunctionNode(const std::string& name, std::unique_ptr<ASTNode> arg)
        : ASTNode(ASTNodeType::Function), func_name(name), argument(std::move(arg)) {}
};

} // namespace axiom::math
