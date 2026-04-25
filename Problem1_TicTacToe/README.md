# Problem 1: Tic-Tac-Toe AI

## Overview
An interactive Tic-Tac-Toe game where the user plays against an AI opponent that always makes the optimal move.

## Algorithms Implemented

### 1. Minimax Algorithm

The Minimax algorithm is a **recursive decision-making algorithm** used in two-player zero-sum games.

**How it works:**
```
function minimax(board, depth, isMaximizing):
    if terminal state reached:
        return evaluation score
    
    if isMaximizing:
        bestScore = -infinity
        for each available move:
            make move (AI plays 'O')
            score = minimax(board, depth+1, false)
            undo move
            bestScore = max(bestScore, score)
        return bestScore
    else:
        bestScore = +infinity
        for each available move:
            make move (Player plays 'X')
            score = minimax(board, depth+1, true)
            undo move
            bestScore = min(bestScore, score)
        return bestScore
```

**Evaluation:**
- AI Wins (O) → +10
- Player Wins (X) → -10
- Draw → 0
- Depth penalty: Prefer faster wins (`+10 - depth`) and slower losses (`-10 + depth`)

### 2. Alpha-Beta Pruning

An **optimization of Minimax** that eliminates branches which cannot influence the final decision.

**Key Concept:**
- **Alpha (α):** Best score the maximizer can guarantee
- **Beta (β):** Best score the minimizer can guarantee
- **Pruning:** When β ≤ α, stop exploring remaining children (they won't be chosen)

**Pseudocode addition:**
```
alpha = max(alpha, bestScore)   // Maximizer update
if beta <= alpha:
    break                        // Prune remaining branches
```

## Comparison

| Metric | Minimax | Alpha-Beta |
|--------|---------|------------|
| Completeness | ✅ Yes | ✅ Yes |
| Optimality | ✅ Yes | ✅ Yes (same result) |
| Nodes Explored | All | Significantly fewer |
| Speed | Baseline | 4-18× faster |

## Files
- `app.py` — Backend implementation (lines 20-207)
- `templates/index.html` — Game interface
- `static/script.js` — Frontend game logic
- `static/style.css` — Styling
