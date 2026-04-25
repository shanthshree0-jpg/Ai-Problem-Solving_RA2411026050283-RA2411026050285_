/* ═══════════════════════════════════════════════════
   Sudoku CSP Solver — Frontend Logic
   ═══════════════════════════════════════════════════ */

const sudokuState = {
    puzzle: [],       // Original puzzle (0 = empty)
    solution: [],     // Server-provided solution
    userGrid: [],     // Current user entries
    selectedCell: null,
    selectedNum: null,
    gameOver: false,
};

const grid = document.getElementById("sudokuGrid");
const statusText = document.getElementById("statusText");
const statusIndicator = document.getElementById("statusIndicator");

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
    buildGrid();
    loadNewPuzzle();
    setupNumberPad();
    setupKeyboardInput();
});

// ── Build the 9x9 Grid ──
function buildGrid() {
    grid.innerHTML = "";
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement("div");
            cell.className = "sudoku-cell";
            cell.id = `sudoku-${r}-${c}`;
            cell.dataset.row = r;
            cell.dataset.col = c;

            // 3x3 box borders
            if (c === 2 || c === 5) cell.classList.add("border-right");
            if (r === 2 || r === 5) cell.classList.add("border-bottom");

            cell.addEventListener("click", () => selectCell(r, c));
            grid.appendChild(cell);
        }
    }
}

// ── Load a New Puzzle from Server ──
async function loadNewPuzzle() {
    statusText.textContent = "Loading puzzle...";
    statusIndicator.className = "status-indicator thinking";
    sudokuState.gameOver = false;

    try {
        const res = await fetch("/api/sudoku/generate");
        const data = await res.json();

        sudokuState.puzzle = data.puzzle;
        sudokuState.solution = data.solution;
        sudokuState.userGrid = data.puzzle.map(row => [...row]);
        sudokuState.selectedCell = null;

        renderGrid();
        updateProgress();

        statusText.textContent = "Fill the empty cells with digits 1-9";
        statusIndicator.className = "status-indicator";

        // Hide solver stats
        document.getElementById("solverStatsCard").style.display = "none";

        // Clear errors
        document.querySelectorAll(".sudoku-cell").forEach(c => {
            c.classList.remove("error", "solved-by-ai");
        });

    } catch (err) {
        statusText.textContent = "Failed to load puzzle. Try again.";
        console.error(err);
    }
}

// ── Render the Grid ──
function renderGrid() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.getElementById(`sudoku-${r}-${c}`);
            const val = sudokuState.userGrid[r][c];
            const isGiven = sudokuState.puzzle[r][c] !== 0;

            cell.textContent = val !== 0 ? val : "";
            cell.classList.remove("given", "user-entered", "selected", "highlighted", "same-number", "error", "solved-by-ai");

            if (isGiven) {
                cell.classList.add("given");
            } else if (val !== 0) {
                cell.classList.add("user-entered");
            }
        }
    }
}

// ── Select a Cell ──
function selectCell(r, c) {
    if (sudokuState.gameOver) return;

    // Don't select given cells
    if (sudokuState.puzzle[r][c] !== 0) {
        // Still highlight same numbers
        highlightRelated(r, c);
        return;
    }

    sudokuState.selectedCell = { r, c };
    highlightRelated(r, c);

    // Apply selected number if one is active
    if (sudokuState.selectedNum !== null && sudokuState.selectedNum > 0) {
        placeNumber(r, c, sudokuState.selectedNum);
    }
}

// ── Highlight Related Cells ──
function highlightRelated(row, col) {
    // Clear all highlights
    document.querySelectorAll(".sudoku-cell").forEach(cell => {
        cell.classList.remove("selected", "highlighted", "same-number");
    });

    const selectedVal = sudokuState.userGrid[row][col];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.getElementById(`sudoku-${r}-${c}`);

            // Highlight same row, column, or box
            const sameRow = r === row;
            const sameCol = c === col;
            const sameBox = Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3);

            if (r === row && c === col) {
                cell.classList.add("selected");
            } else if (sameRow || sameCol || sameBox) {
                cell.classList.add("highlighted");
            }

            // Highlight same number
            if (selectedVal !== 0 && sudokuState.userGrid[r][c] === selectedVal && !(r === row && c === col)) {
                cell.classList.add("same-number");
            }
        }
    }
}

// ── Place a Number ──
function placeNumber(r, c, num) {
    if (sudokuState.puzzle[r][c] !== 0) return; // Can't modify given cells
    if (sudokuState.gameOver) return;

    sudokuState.userGrid[r][c] = num;

    const cell = document.getElementById(`sudoku-${r}-${c}`);
    cell.classList.remove("error", "solved-by-ai");

    if (num === 0) {
        cell.textContent = "";
        cell.classList.remove("user-entered");
    } else {
        cell.textContent = num;
        cell.classList.add("user-entered");

        // Quick constraint check for immediate feedback
        if (!isValidPlacement(r, c, num)) {
            cell.classList.add("error");
        }
    }

    highlightRelated(r, c);
    updateProgress();
}

// ── Quick Constraint Check ──
function isValidPlacement(row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (c !== col && sudokuState.userGrid[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
        if (r !== row && sudokuState.userGrid[r][col] === num) return false;
    }
    // Check 3x3 box
    const boxR = Math.floor(row / 3) * 3;
    const boxC = Math.floor(col / 3) * 3;
    for (let r = boxR; r < boxR + 3; r++) {
        for (let c = boxC; c < boxC + 3; c++) {
            if (!(r === row && c === col) && sudokuState.userGrid[r][c] === num) return false;
        }
    }
    return true;
}

// ── Number Pad Setup ──
function setupNumberPad() {
    document.querySelectorAll(".num-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const num = parseInt(btn.dataset.num);

            // Toggle active state
            document.querySelectorAll(".num-btn").forEach(b => b.classList.remove("active"));
            if (sudokuState.selectedNum === num) {
                sudokuState.selectedNum = null;
            } else {
                sudokuState.selectedNum = num;
                btn.classList.add("active");
            }

            // If a cell is selected, place the number
            if (sudokuState.selectedCell) {
                const { r, c } = sudokuState.selectedCell;
                placeNumber(r, c, num);
            }
        });
    });
}

// ── Keyboard Input ──
function setupKeyboardInput() {
    document.addEventListener("keydown", (e) => {
        if (!sudokuState.selectedCell || sudokuState.gameOver) return;

        const { r, c } = sudokuState.selectedCell;

        // Number keys 1-9
        if (e.key >= "1" && e.key <= "9") {
            placeNumber(r, c, parseInt(e.key));
        }

        // Delete / Backspace / 0 to clear
        if (e.key === "Delete" || e.key === "Backspace" || e.key === "0") {
            placeNumber(r, c, 0);
        }

        // Arrow key navigation
        let newR = r, newC = c;
        if (e.key === "ArrowUp") newR = Math.max(0, r - 1);
        if (e.key === "ArrowDown") newR = Math.min(8, r + 1);
        if (e.key === "ArrowLeft") newC = Math.max(0, c - 1);
        if (e.key === "ArrowRight") newC = Math.min(8, c + 1);

        if (newR !== r || newC !== c) {
            e.preventDefault();
            sudokuState.selectedCell = { r: newR, c: newC };
            highlightRelated(newR, newC);
            // If new cell is empty and a number is active, place it
            // (but don't auto-fill on arrow navigation)
        }
    });
}

// ── Update Progress ──
function updateProgress() {
    let filled = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (sudokuState.userGrid[r][c] !== 0) filled++;
        }
    }
    const remaining = 81 - filled;
    const percent = (filled / 81) * 100;

    document.getElementById("cellsFilled").textContent = `${filled} / 81`;
    document.getElementById("cellsRemaining").textContent = remaining;
    document.getElementById("fillBar").style.width = percent + "%";
}

// ── Validate Solution ──
async function validateSolution() {
    statusText.textContent = "Checking your solution...";
    statusIndicator.className = "status-indicator thinking";

    try {
        const res = await fetch("/api/sudoku/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grid: sudokuState.userGrid }),
        });
        const data = await res.json();

        if (data.valid) {
            // WIN!
            sudokuState.gameOver = true;
            statusText.textContent = "You Won!";
            statusIndicator.className = "status-indicator game-over";
            showModal("🏆", "You Won!", "Congratulations! You solved the Sudoku puzzle correctly!");
        } else if (!data.complete) {
            statusText.textContent = "Puzzle incomplete — keep going!";
            statusIndicator.className = "status-indicator";
            showModal("📝", "Not Complete", data.message);
        } else {
            // Has errors
            statusText.textContent = "Some constraints violated — try again!";
            statusIndicator.className = "status-indicator";
            highlightErrors();
            showModal("❌", "Try Again!", data.message);
        }
    } catch (err) {
        statusText.textContent = "Validation failed. Try again.";
        console.error(err);
    }
}

// ── Highlight Error Cells ──
function highlightErrors() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = sudokuState.userGrid[r][c];
            if (val !== 0 && sudokuState.puzzle[r][c] === 0) {
                if (!isValidPlacement(r, c, val)) {
                    document.getElementById(`sudoku-${r}-${c}`).classList.add("error");
                }
            }
        }
    }
}

// ── Auto-Solve using CSP ──
async function autoSolve() {
    statusText.textContent = "AI solving with CSP...";
    statusIndicator.className = "status-indicator thinking";

    try {
        const res = await fetch("/api/sudoku/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grid: sudokuState.puzzle }),
        });
        const data = await res.json();

        if (data.solved) {
            // Animate the solution filling in
            const solvedGrid = data.grid;
            let delay = 0;

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (sudokuState.puzzle[r][c] === 0) {
                        delay += 30;
                        setTimeout(() => {
                            sudokuState.userGrid[r][c] = solvedGrid[r][c];
                            const cell = document.getElementById(`sudoku-${r}-${c}`);
                            cell.textContent = solvedGrid[r][c];
                            cell.classList.remove("user-entered", "error");
                            cell.classList.add("solved-by-ai");
                            updateProgress();
                        }, delay);
                    }
                }
            }

            // Show stats after animation
            setTimeout(() => {
                sudokuState.gameOver = true;
                statusText.textContent = "Solved by CSP!";
                statusIndicator.className = "status-indicator game-over";

                // Show solver stats
                const statsCard = document.getElementById("solverStatsCard");
                statsCard.style.display = "block";
                document.getElementById("solverNodes").textContent = data.stats.nodes_explored.toLocaleString();
                document.getElementById("solverBacktracks").textContent = data.stats.backtracks.toLocaleString();
                document.getElementById("solverChecks").textContent = data.stats.constraint_checks.toLocaleString();
                document.getElementById("solverTime").textContent = data.stats.time_ms.toFixed(3) + " ms";
            }, delay + 200);

        } else {
            statusText.textContent = "No solution found!";
            showModal("❌", "Unsolvable", "The CSP solver could not find a valid solution.");
        }
    } catch (err) {
        statusText.textContent = "Solve failed. Try again.";
        console.error(err);
    }
}

// ── Modal ──
function showModal(icon, title, message) {
    document.getElementById("modalIcon").textContent = icon;
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalMessage").textContent = message;
    document.getElementById("resultModal").classList.add("visible");
}

function closeModal() {
    document.getElementById("resultModal").classList.remove("visible");
}
