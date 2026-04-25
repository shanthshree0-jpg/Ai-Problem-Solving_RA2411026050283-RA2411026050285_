# Problem 2: Sudoku Solver (CSP Approach)

## Overview
An interactive Sudoku puzzle where the user can solve it manually or let the AI solve it using the **Constraint Satisfaction Problem (CSP)** approach.

## Algorithm: CSP with Backtracking + MRV Heuristic

### CSP Formulation

A Constraint Satisfaction Problem is defined by three components:

| Component | Sudoku Mapping |
|-----------|---------------|
| **Variables (X)** | Each empty cell `(row, col)` in the 9×9 grid |
| **Domains (D)** | `{1, 2, 3, 4, 5, 6, 7, 8, 9}` for each variable |
| **Constraints (C)** | AllDifferent constraints for rows, columns, and 3×3 boxes |

### Constraints

```
1. Row Constraint:    AllDiff(row[i])     for i = 0..8
2. Column Constraint: AllDiff(col[j])     for j = 0..8
3. Box Constraint:    AllDiff(box[b])     for b = 0..8
```

Each constraint ensures no two variables in the same group share the same value.

### Solving Algorithm

```
function CSP_Solve(grid):
    nodes_explored += 1
    
    // Select unassigned variable using MRV heuristic
    cell = find_cell_with_minimum_remaining_values()
    
    if no empty cell:
        return SUCCESS  // All cells filled
    
    // Get domain (legal values) for this cell
    domain = get_valid_values(cell.row, cell.col)
    
    for each value in domain:
        // Assign value
        grid[cell.row][cell.col] = value
        
        // Recurse
        if CSP_Solve(grid):
            return SUCCESS
        
        // Backtrack
        grid[cell.row][cell.col] = 0
        backtracks += 1
    
    return FAILURE  // No valid value found
```

### MRV (Minimum Remaining Values) Heuristic

Instead of selecting variables in order, MRV picks the cell with the **fewest legal values** remaining:

```
function find_cell_with_MRV():
    min_options = 10
    best_cell = None
    
    for each empty cell (r, c):
        options = count valid values for (r, c)
        if options < min_options:
            min_options = options
            best_cell = (r, c)
            if options == 1:  // Can't do better
                return best_cell
    
    return best_cell
```

**Why MRV works:** By choosing the most constrained variable first (fail-first strategy), dead ends are detected early, reducing the search space dramatically.

### Constraint Checking

For each candidate value, three checks are performed:

1. **Row Check:** Is the value already in this row?
2. **Column Check:** Is the value already in this column?
3. **Box Check:** Is the value already in this 3×3 subgrid?

```python
def is_valid(row, col, num):
    # Row constraint
    if num in grid[row]: return False
    
    # Column constraint
    for r in range(9):
        if grid[r][col] == num: return False
    
    # Box constraint
    box_row, box_col = 3*(row//3), 3*(col//3)
    for r in range(box_row, box_row+3):
        for c in range(box_col, box_col+3):
            if grid[r][c] == num: return False
    
    return True
```

## Performance (Easy Level Puzzles)

| Metric | Typical Value |
|--------|--------------|
| Nodes Explored | 30-50 |
| Backtracks | 0-2 |
| Constraint Checks | 1,000-4,000 |
| Solve Time | 1-5 ms |

## Features
- Randomized puzzle generation with unique solutions
- Interactive cell selection + number pad input
- Real-time constraint validation (errors highlighted in red)
- "Check Solution" → "You Won!" or "Try Again!"
- "AI Solve (CSP)" → Animated solution with statistics
- Progress tracker (cells filled / 81)

## Files
- `app.py` — Backend CSP solver (lines 170-290)
- `templates/sudoku.html` — Sudoku interface
- `static/sudoku.js` — Frontend logic
- `static/sudoku.css` — Sudoku-specific styles
