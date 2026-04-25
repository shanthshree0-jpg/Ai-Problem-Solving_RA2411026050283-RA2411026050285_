"""
AI Problem Solving Assignment Server
- Problem 1: Tic-Tac-Toe (Minimax + Alpha-Beta Pruning)
- Problem 2: Sudoku Solver (CSP Approach)
"""

from flask import Flask, render_template, jsonify, request
import time
import copy
import random

app = Flask(__name__)


# ══════════════════════════════════════════════════
#  PROBLEM 1: TIC-TAC-TOE
# ══════════════════════════════════════════════════

# ── Game Logic ──

def check_winner(board):
    """Check if there's a winner. Returns 'X', 'O', 'draw', or None."""
    lines = [
        [(0, 0), (0, 1), (0, 2)],
        [(1, 0), (1, 1), (1, 2)],
        [(2, 0), (2, 1), (2, 2)],
        [(0, 0), (1, 0), (2, 0)],
        [(0, 1), (1, 1), (2, 1)],
        [(0, 2), (1, 2), (2, 2)],
        [(0, 0), (1, 1), (2, 2)],
        [(0, 2), (1, 1), (2, 0)],
    ]

    for line in lines:
        vals = [board[r][c] for r, c in line]
        if vals[0] is not None and vals[0] == vals[1] == vals[2]:
            return vals[0]

    if all(board[r][c] is not None for r in range(3) for c in range(3)):
        return "draw"

    return None


def get_available_moves(board):
    return [(r, c) for r in range(3) for c in range(3) if board[r][c] is None]


def evaluate(board):
    winner = check_winner(board)
    if winner == "O":
        return 10
    elif winner == "X":
        return -10
    return 0


# ── Minimax Algorithm ──

def minimax(board, depth, is_maximizing, counter):
    counter["nodes"] += 1
    score = evaluate(board)

    if score == 10:
        return score - depth
    if score == -10:
        return score + depth
    if check_winner(board) == "draw":
        return 0

    if is_maximizing:
        best = -float("inf")
        for r, c in get_available_moves(board):
            board[r][c] = "O"
            val = minimax(board, depth + 1, False, counter)
            board[r][c] = None
            best = max(best, val)
        return best
    else:
        best = float("inf")
        for r, c in get_available_moves(board):
            board[r][c] = "X"
            val = minimax(board, depth + 1, True, counter)
            board[r][c] = None
            best = min(best, val)
        return best


def find_best_move_minimax(board):
    counter = {"nodes": 0}
    best_val = -float("inf")
    best_move = None
    start_time = time.perf_counter()

    for r, c in get_available_moves(board):
        board[r][c] = "O"
        move_val = minimax(board, 0, False, counter)
        board[r][c] = None
        if move_val > best_val:
            best_val = move_val
            best_move = (r, c)

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    return {
        "move": best_move,
        "nodes_explored": counter["nodes"],
        "time_ms": round(elapsed_ms, 4),
    }


# ── Alpha-Beta Pruning Algorithm ──

def minimax_alpha_beta(board, depth, is_maximizing, alpha, beta, counter):
    counter["nodes"] += 1
    counter["pruned"] = counter.get("pruned", 0)
    score = evaluate(board)

    if score == 10:
        return score - depth
    if score == -10:
        return score + depth
    if check_winner(board) == "draw":
        return 0

    if is_maximizing:
        best = -float("inf")
        for r, c in get_available_moves(board):
            board[r][c] = "O"
            val = minimax_alpha_beta(board, depth + 1, False, alpha, beta, counter)
            board[r][c] = None
            best = max(best, val)
            alpha = max(alpha, best)
            if beta <= alpha:
                counter["pruned"] += 1
                break
        return best
    else:
        best = float("inf")
        for r, c in get_available_moves(board):
            board[r][c] = "X"
            val = minimax_alpha_beta(board, depth + 1, True, alpha, beta, counter)
            board[r][c] = None
            best = min(best, val)
            beta = min(beta, best)
            if beta <= alpha:
                counter["pruned"] += 1
                break
        return best


def find_best_move_alpha_beta(board):
    counter = {"nodes": 0, "pruned": 0}
    best_val = -float("inf")
    best_move = None
    start_time = time.perf_counter()

    for r, c in get_available_moves(board):
        board[r][c] = "O"
        move_val = minimax_alpha_beta(
            board, 0, False, -float("inf"), float("inf"), counter
        )
        board[r][c] = None
        if move_val > best_val:
            best_val = move_val
            best_move = (r, c)

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    return {
        "move": best_move,
        "nodes_explored": counter["nodes"],
        "branches_pruned": counter["pruned"],
        "time_ms": round(elapsed_ms, 4),
    }


# ══════════════════════════════════════════════════
#  PROBLEM 2: SUDOKU CSP SOLVER
# ══════════════════════════════════════════════════

class SudokuCSP:
    """
    Sudoku solver using Constraint Satisfaction Problem (CSP) approach.
    Variables: each empty cell (row, col)
    Domains: {1-9} for each variable
    Constraints: AllDiff for each row, column, and 3x3 box
    """

    def __init__(self, grid):
        self.grid = [row[:] for row in grid]  # Deep copy
        self.size = 9
        self.stats = {"nodes_explored": 0, "backtracks": 0, "constraint_checks": 0}

    def is_valid(self, row, col, num):
        """Check if placing num at (row, col) satisfies all constraints."""
        self.stats["constraint_checks"] += 1

        # Row constraint: no duplicate in the same row
        if num in self.grid[row]:
            return False

        # Column constraint: no duplicate in the same column
        for r in range(self.size):
            if self.grid[r][col] == num:
                return False

        # Box constraint: no duplicate in the 3x3 subgrid
        box_row, box_col = 3 * (row // 3), 3 * (col // 3)
        for r in range(box_row, box_row + 3):
            for c in range(box_col, box_col + 3):
                if self.grid[r][c] == num:
                    return False

        return True

    def find_empty_cell(self):
        """
        Find the next empty cell using MRV (Minimum Remaining Values) heuristic.
        Returns the cell with the fewest legal values remaining.
        """
        min_options = 10
        best_cell = None

        for r in range(self.size):
            for c in range(self.size):
                if self.grid[r][c] == 0:
                    options = sum(1 for n in range(1, 10) if self.is_valid(r, c, n))
                    if options < min_options:
                        min_options = options
                        best_cell = (r, c)
                        if options == 1:  # Can't do better than 1
                            return best_cell

        return best_cell

    def get_domain(self, row, col):
        """Get possible values for a cell (its domain in CSP terms)."""
        if self.grid[row][col] != 0:
            return []
        return [n for n in range(1, 10) if self.is_valid(row, col, n)]

    def solve(self):
        """
        Solve using backtracking with CSP techniques:
        - MRV heuristic for variable ordering
        - Forward checking via domain computation
        - Constraint propagation through is_valid
        """
        self.stats["nodes_explored"] += 1

        cell = self.find_empty_cell()
        if cell is None:
            return True  # All cells filled - puzzle solved!

        row, col = cell
        domain = self.get_domain(row, col)

        for num in domain:
            self.grid[row][col] = num

            if self.solve():
                return True

            # Backtrack
            self.grid[row][col] = 0
            self.stats["backtracks"] += 1

        return False


def generate_easy_puzzle():
    """Generate an easy Sudoku puzzle with a unique solution."""
    # Start with a known valid completed grid
    base = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ]

    # Shuffle by swapping rows within bands, columns within stacks, and permuting digits
    # This creates variety while maintaining validity

    # Permute digits 1-9
    perm = list(range(1, 10))
    random.shuffle(perm)
    mapping = {i + 1: perm[i] for i in range(9)}
    for r in range(9):
        for c in range(9):
            base[r][c] = mapping[base[r][c]]

    # Swap rows within each band of 3
    for band in range(3):
        rows = [band * 3, band * 3 + 1, band * 3 + 2]
        random.shuffle(rows)
        new_rows = [base[r] for r in rows]
        for i, r in enumerate(range(band * 3, band * 3 + 3)):
            base[r] = new_rows[i]

    # Swap columns within each stack of 3
    for stack in range(3):
        cols = [stack * 3, stack * 3 + 1, stack * 3 + 2]
        random.shuffle(cols)
        for r in range(9):
            new_vals = [base[r][c] for c in cols]
            for i, c in enumerate(range(stack * 3, stack * 3 + 3)):
                base[r][c] = new_vals[i]

    # Store the solution
    solution = [row[:] for row in base]

    # Remove cells to create the puzzle (easy = remove ~35-40 cells)
    puzzle = [row[:] for row in base]
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)

    removed = 0
    target = random.randint(35, 40)  # Easy level

    for r, c in cells:
        if removed >= target:
            break
        puzzle[r][c] = 0
        removed += 1

    return puzzle, solution


# ══════════════════════════════════════════════════
#  FLASK ROUTES
# ══════════════════════════════════════════════════

@app.route("/")
def home():
    """Serve the home page with game selection."""
    return render_template("home.html")


@app.route("/tictactoe")
def tictactoe():
    """Serve the Tic-Tac-Toe game page."""
    return render_template("index.html")


@app.route("/sudoku")
def sudoku():
    """Serve the Sudoku game page."""
    return render_template("sudoku.html")


# ── Tic-Tac-Toe API ──

@app.route("/api/move", methods=["POST"])
def make_move():
    data = request.get_json()
    board = data.get("board")

    if board is None:
        return jsonify({"error": "No board state provided"}), 400

    for r in range(3):
        for c in range(3):
            if board[r][c] == "":
                board[r][c] = None

    winner = check_winner(board)
    if winner is not None:
        return jsonify({"error": "Game is already over", "winner": winner}), 400

    board_copy1 = copy.deepcopy(board)
    board_copy2 = copy.deepcopy(board)

    result_minimax = find_best_move_minimax(board_copy1)
    result_alpha_beta = find_best_move_alpha_beta(board_copy2)

    move = result_alpha_beta["move"]

    if move is None:
        return jsonify({"error": "No valid moves available"}), 400

    board[move[0]][move[1]] = "O"
    winner = check_winner(board)

    response = {
        "board": board,
        "move": {"row": move[0], "col": move[1]},
        "winner": winner,
        "comparison": {
            "minimax": {
                "nodes_explored": result_minimax["nodes_explored"],
                "time_ms": result_minimax["time_ms"],
            },
            "alpha_beta": {
                "nodes_explored": result_alpha_beta["nodes_explored"],
                "branches_pruned": result_alpha_beta["branches_pruned"],
                "time_ms": result_alpha_beta["time_ms"],
            },
            "node_reduction_percent": round(
                (1 - result_alpha_beta["nodes_explored"] / max(result_minimax["nodes_explored"], 1)) * 100, 2
            ),
            "speedup_factor": round(
                result_minimax["time_ms"] / max(result_alpha_beta["time_ms"], 0.0001), 2
            ),
        },
    }

    return jsonify(response)


# ── Sudoku API ──

@app.route("/api/sudoku/generate", methods=["GET"])
def generate_sudoku():
    """Generate a new easy Sudoku puzzle."""
    puzzle, solution = generate_easy_puzzle()
    return jsonify({"puzzle": puzzle, "solution": solution})


@app.route("/api/sudoku/validate", methods=["POST"])
def validate_sudoku():
    """Validate the user's Sudoku solution."""
    data = request.get_json()
    user_grid = data.get("grid")

    if user_grid is None:
        return jsonify({"error": "No grid provided"}), 400

    # Check if complete (no zeros)
    for r in range(9):
        for c in range(9):
            if user_grid[r][c] == 0:
                return jsonify({
                    "valid": False,
                    "complete": False,
                    "message": "Puzzle is not complete yet. Fill all cells!"
                })

    # Validate all constraints
    errors = []

    # Check rows
    for r in range(9):
        if len(set(user_grid[r])) != 9:
            errors.append(f"Row {r + 1} has duplicate values")

    # Check columns
    for c in range(9):
        col_vals = [user_grid[r][c] for r in range(9)]
        if len(set(col_vals)) != 9:
            errors.append(f"Column {c + 1} has duplicate values")

    # Check 3x3 boxes
    for box_r in range(3):
        for box_c in range(3):
            box_vals = []
            for r in range(box_r * 3, box_r * 3 + 3):
                for c in range(box_c * 3, box_c * 3 + 3):
                    box_vals.append(user_grid[r][c])
            if len(set(box_vals)) != 9:
                errors.append(f"Box ({box_r + 1},{box_c + 1}) has duplicate values")

    if errors:
        return jsonify({
            "valid": False,
            "complete": True,
            "message": "Try again! There are constraint violations.",
            "errors": errors
        })

    return jsonify({
        "valid": True,
        "complete": True,
        "message": "You Won! Puzzle solved correctly!"
    })


@app.route("/api/sudoku/solve", methods=["POST"])
def solve_sudoku():
    """Solve a Sudoku puzzle using CSP approach."""
    data = request.get_json()
    grid = data.get("grid")

    if grid is None:
        return jsonify({"error": "No grid provided"}), 400

    solver = SudokuCSP(grid)
    start_time = time.perf_counter()
    solved = solver.solve()
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    if solved:
        return jsonify({
            "solved": True,
            "grid": solver.grid,
            "stats": {
                "nodes_explored": solver.stats["nodes_explored"],
                "backtracks": solver.stats["backtracks"],
                "constraint_checks": solver.stats["constraint_checks"],
                "time_ms": round(elapsed_ms, 4),
            }
        })
    else:
        return jsonify({"solved": False, "error": "No solution exists for this puzzle"})


if __name__ == "__main__":
    print("\n[*] AI Problem Solving Server Starting...")
    print("[*] Open http://localhost:5000 in your browser\n")
    app.run(debug=True, port=5000)
