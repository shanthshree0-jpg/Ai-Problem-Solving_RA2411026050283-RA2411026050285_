/* ═══════════════════════════════════════════════════
   Tic-Tac-Toe AI — Game Logic & UI Controller
   Supports Solo (vs AI) and Multiplayer modes
   ═══════════════════════════════════════════════════ */

// ── Game State ──
const state = {
    board: [
        [null, null, null],
        [null, null, null],
        [null, null, null],
    ],
    currentPlayer: "X",
    gameActive: true,
    isAIThinking: false,
    moveCount: 0,
    mode: null, // 'solo' or 'multiplayer'
    scores: { player: 0, ai: 0, draw: 0 },
    // For multiplayer
    mpScores: { x: 0, o: 0, draw: 0 },
    cumulative: {
        totalMoves: 0,
        totalMinimaxNodes: 0,
        totalAlphaBetaNodes: 0,
        totalPruned: 0,
    },
};

// ── DOM Elements ──
const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("statusText");
const statusIndicator = document.getElementById("statusIndicator");
const moveHistory = document.getElementById("moveHistory");
const resultModal = document.getElementById("resultModal");

// ── Initialize ──
document.addEventListener("DOMContentLoaded", () => {
    cells.forEach((cell) => {
        cell.addEventListener("click", () => handleCellClick(cell));
    });
    showModeSelection();
});

// ── Mode Selection ──
function showModeSelection() {
    // Disable board until mode is selected
    state.gameActive = false;
    cells.forEach((c) => c.classList.add("disabled"));

    const modeModal = document.getElementById("modeModal");
    if (modeModal) {
        modeModal.classList.add("visible");
    }
}

function selectMode(mode) {
    state.mode = mode;
    const modeModal = document.getElementById("modeModal");
    if (modeModal) {
        modeModal.classList.remove("visible");
    }

    // Update UI for mode
    const analyticsSection = document.querySelector(".analytics-section");
    const headerBadges = document.querySelector(".header-badges");

    if (mode === "multiplayer") {
        // Hide AI analytics in multiplayer
        analyticsSection.classList.add("multiplayer-mode");
        headerBadges.innerHTML = `
            <span class="badge badge-player">P1: X</span>
            <span class="badge badge-ai">P2: O</span>
        `;
        // Update score labels
        document.querySelector(".score-item:first-child .score-label").textContent = "P1";
        document.querySelector(".score-item:last-child .score-label").textContent = "P2";
    } else {
        analyticsSection.classList.remove("multiplayer-mode");
        headerBadges.innerHTML = `
            <span class="badge badge-player">You: X</span>
            <span class="badge badge-ai">AI: O</span>
        `;
        document.querySelector(".score-item:first-child .score-label").textContent = "You";
        document.querySelector(".score-item:last-child .score-label").textContent = "AI";
    }

    resetGame();
}

// ── Cell Click Handler ──
function handleCellClick(cell) {
    if (!state.gameActive || state.isAIThinking || !state.mode) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (state.board[row][col] !== null) return;

    if (state.mode === "solo") {
        handleSoloClick(row, col, cell);
    } else {
        handleMultiplayerClick(row, col, cell);
    }
}

// ── Solo Mode (vs AI) ──
function handleSoloClick(row, col, cell) {
    // Player's move
    placeMarker(row, col, "X", cell);
    state.moveCount++;
    addMoveToHistory(state.moveCount, "X", row, col);

    // Check for game end after player move
    const winner = checkWinnerLocal();
    if (winner) {
        endGame(winner);
        return;
    }

    // AI's turn
    state.isAIThinking = true;
    statusText.textContent = "AI is thinking...";
    statusIndicator.className = "status-indicator thinking";
    cells.forEach((c) => c.classList.add("disabled"));

    // Small delay for visual feedback
    setTimeout(() => requestAIMove(), 300);
}

// ── Multiplayer Mode ──
function handleMultiplayerClick(row, col, cell) {
    const player = state.currentPlayer;
    placeMarker(row, col, player, cell);
    state.moveCount++;
    addMoveToHistory(state.moveCount, player, row, col);

    const winner = checkWinnerLocal();
    if (winner) {
        endGame(winner);
        return;
    }

    // Switch turns
    state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
    statusText.textContent = `Player ${state.currentPlayer === "X" ? "1 (X)" : "2 (O)"}'s turn`;
    statusIndicator.className = "status-indicator";
}

// ── Place Marker on Board ──
function placeMarker(row, col, player, cell) {
    state.board[row][col] = player;
    const mark = document.createElement("span");
    mark.className = `mark ${player === "X" ? "x-mark" : "o-mark"}`;
    mark.textContent = player;
    cell.innerHTML = "";
    cell.appendChild(mark);
    cell.classList.add("taken");
}

// ── Request AI Move from Server ──
async function requestAIMove() {
    try {
        const response = await fetch("/api/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                board: state.board.map((row) =>
                    row.map((cell) => (cell === null ? "" : cell))
                ),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API error:", data.error);
            state.isAIThinking = false;
            return;
        }

        // Apply AI's move
        const { row, col } = data.move;
        const cell = document.getElementById(`cell-${row}-${col}`);
        placeMarker(row, col, "O", cell);
        state.moveCount++;
        addMoveToHistory(state.moveCount, "O", row, col, data.comparison);

        // Update analytics
        updateAnalytics(data.comparison);

        // Check for game end
        if (data.winner) {
            endGame(data.winner);
        } else {
            state.isAIThinking = false;
            statusText.textContent = "Your turn — place X";
            statusIndicator.className = "status-indicator";
            cells.forEach((c) => {
                if (!c.classList.contains("taken")) {
                    c.classList.remove("disabled");
                }
            });
        }
    } catch (error) {
        console.error("Failed to get AI move:", error);
        state.isAIThinking = false;
        statusText.textContent = "Error — try again";
    }
}

// ── Update Analytics Panel ──
function updateAnalytics(comparison) {
    // Per-move stats
    document.getElementById("minimaxNodes").textContent = comparison.minimax.nodes_explored.toLocaleString();
    document.getElementById("minimaxTime").textContent = comparison.minimax.time_ms.toFixed(3);
    document.getElementById("alphaBetaNodes").textContent = comparison.alpha_beta.nodes_explored.toLocaleString();
    document.getElementById("alphaBetaTime").textContent = comparison.alpha_beta.time_ms.toFixed(3);
    document.getElementById("branchesPruned").textContent = comparison.alpha_beta.branches_pruned;

    // Efficiency
    const reduction = Math.max(0, comparison.node_reduction_percent);
    document.getElementById("reductionBar").style.width = reduction + "%";
    document.getElementById("reductionPercent").textContent = reduction.toFixed(1) + "%";
    document.getElementById("speedupBadge").textContent = comparison.speedup_factor + "×";

    // Cumulative
    state.cumulative.totalMoves++;
    state.cumulative.totalMinimaxNodes += comparison.minimax.nodes_explored;
    state.cumulative.totalAlphaBetaNodes += comparison.alpha_beta.nodes_explored;
    state.cumulative.totalPruned += comparison.alpha_beta.branches_pruned;

    document.getElementById("totalMoves").textContent = state.cumulative.totalMoves;
    document.getElementById("totalMinimaxNodes").textContent = state.cumulative.totalMinimaxNodes.toLocaleString();
    document.getElementById("totalAlphaBetaNodes").textContent = state.cumulative.totalAlphaBetaNodes.toLocaleString();
    document.getElementById("totalPruned").textContent = state.cumulative.totalPruned;
}

// ── Move History ──
function addMoveToHistory(num, player, row, col, comparison = null) {
    const emptyMsg = moveHistory.querySelector(".history-empty");
    if (emptyMsg) emptyMsg.remove();

    const item = document.createElement("div");
    item.className = "history-item";

    let nodesInfo = "";
    if (comparison) {
        nodesInfo = `<span class="history-nodes">MM:${comparison.minimax.nodes_explored} | AB:${comparison.alpha_beta.nodes_explored}</span>`;
    }

    item.innerHTML = `
        <span class="history-move-num">#${num}</span>
        <span class="history-player player-${player.toLowerCase()}">${player}</span>
        <span class="history-pos">R${row + 1}C${col + 1}</span>
        ${nodesInfo}
    `;

    moveHistory.insertBefore(item, moveHistory.firstChild);
    moveHistory.scrollTop = 0;
}

// ── Check Winner (Client-side) ──
function checkWinnerLocal() {
    const b = state.board;
    const lines = [
        // Rows
        { cells: [[0,0],[0,1],[0,2]], type: "row", index: 0 },
        { cells: [[1,0],[1,1],[1,2]], type: "row", index: 1 },
        { cells: [[2,0],[2,1],[2,2]], type: "row", index: 2 },
        // Columns
        { cells: [[0,0],[1,0],[2,0]], type: "col", index: 0 },
        { cells: [[0,1],[1,1],[2,1]], type: "col", index: 1 },
        { cells: [[0,2],[1,2],[2,2]], type: "col", index: 2 },
        // Diagonals
        { cells: [[0,0],[1,1],[2,2]], type: "diag", index: 0 },
        { cells: [[0,2],[1,1],[2,0]], type: "diag", index: 1 },
    ];

    for (const line of lines) {
        const vals = line.cells.map(([r, c]) => b[r][c]);
        if (vals[0] && vals[0] === vals[1] && vals[1] === vals[2]) {
            highlightWin(line);
            return vals[0];
        }
    }

    // Draw
    if (b.every((row) => row.every((cell) => cell !== null))) {
        return "draw";
    }

    return null;
}

// ── Highlight Winning Line ──
function highlightWin(line) {
    line.cells.forEach(([r, c]) => {
        document.getElementById(`cell-${r}-${c}`).classList.add("win-cell");
    });

    // Draw win line on SVG
    const cellSize = 330 / 3;
    const getCenter = (r, c) => ({
        x: c * cellSize + cellSize / 2,
        y: r * cellSize + cellSize / 2,
    });

    const start = getCenter(line.cells[0][0], line.cells[0][1]);
    const end = getCenter(line.cells[2][0], line.cells[2][1]);

    const winLine = document.getElementById("winLine");
    winLine.setAttribute("x1", start.x);
    winLine.setAttribute("y1", start.y);
    winLine.setAttribute("x2", end.x);
    winLine.setAttribute("y2", end.y);

    requestAnimationFrame(() => {
        winLine.classList.add("visible");
    });
}

// ── End Game ──
function endGame(winner) {
    state.gameActive = false;
    state.isAIThinking = false;
    statusIndicator.className = "status-indicator game-over";
    cells.forEach((c) => c.classList.add("disabled"));

    let title, message, icon;

    if (state.mode === "solo") {
        if (winner === "X") {
            title = "You Win! 🎉";
            message = "Incredible! You beat the AI!";
            icon = "🏆";
            state.scores.player++;
            document.getElementById("playerScore").textContent = state.scores.player;
        } else if (winner === "O") {
            title = "AI Wins!";
            message = "The AI found the optimal path. Try again!";
            icon = "🤖";
            state.scores.ai++;
            document.getElementById("aiScore").textContent = state.scores.ai;
        } else {
            title = "It's a Draw!";
            message = "Well played! Neither side could find a winning move.";
            icon = "🤝";
            state.scores.draw++;
            document.getElementById("drawScore").textContent = state.scores.draw;
        }
    } else {
        // Multiplayer
        if (winner === "X") {
            title = "Player 1 Wins! 🎉";
            message = "X takes the victory!";
            icon = "🏆";
            state.mpScores.x++;
            document.getElementById("playerScore").textContent = state.mpScores.x;
        } else if (winner === "O") {
            title = "Player 2 Wins! 🎉";
            message = "O claims the win!";
            icon = "🏆";
            state.mpScores.o++;
            document.getElementById("aiScore").textContent = state.mpScores.o;
        } else {
            title = "It's a Draw!";
            message = "Great match! Nobody wins this round.";
            icon = "🤝";
            state.mpScores.draw++;
            document.getElementById("drawScore").textContent = state.mpScores.draw;
        }
    }

    statusText.textContent = title;

    // Show modal after a brief delay
    setTimeout(() => {
        document.getElementById("modalIcon").textContent = icon;
        document.getElementById("modalTitle").textContent = title;
        document.getElementById("modalMessage").textContent = message;
        resultModal.classList.add("visible");
    }, 800);
}

// ── Reset Game ──
function resetGame() {
    state.board = [
        [null, null, null],
        [null, null, null],
        [null, null, null],
    ];
    state.currentPlayer = "X";
    state.gameActive = true;
    state.isAIThinking = false;
    state.moveCount = 0;

    cells.forEach((cell) => {
        cell.innerHTML = "";
        cell.classList.remove("taken", "disabled", "win-cell");
    });

    // Reset win line
    const winLine = document.getElementById("winLine");
    winLine.classList.remove("visible");
    winLine.setAttribute("x1", 0);
    winLine.setAttribute("y1", 0);
    winLine.setAttribute("x2", 0);
    winLine.setAttribute("y2", 0);

    // Reset history
    moveHistory.innerHTML = '<div class="history-empty">No moves yet. Start playing!</div>';

    // Reset per-move analytics display
    document.getElementById("minimaxNodes").textContent = "—";
    document.getElementById("minimaxTime").textContent = "—";
    document.getElementById("alphaBetaNodes").textContent = "—";
    document.getElementById("alphaBetaTime").textContent = "—";
    document.getElementById("branchesPruned").textContent = "—";
    document.getElementById("reductionBar").style.width = "0%";
    document.getElementById("reductionPercent").textContent = "—";
    document.getElementById("speedupBadge").textContent = "—";

    if (state.mode === "solo") {
        statusText.textContent = "Your turn — place X";
    } else if (state.mode === "multiplayer") {
        statusText.textContent = "Player 1 (X)'s turn";
    }
    statusIndicator.className = "status-indicator";

    closeModal();
}

// ── Change Mode ──
function changeMode() {
    // Reset everything and show mode selection
    state.scores = { player: 0, ai: 0, draw: 0 };
    state.mpScores = { x: 0, o: 0, draw: 0 };
    state.cumulative = { totalMoves: 0, totalMinimaxNodes: 0, totalAlphaBetaNodes: 0, totalPruned: 0 };
    state.mode = null;

    document.getElementById("playerScore").textContent = "0";
    document.getElementById("drawScore").textContent = "0";
    document.getElementById("aiScore").textContent = "0";
    document.getElementById("totalMoves").textContent = "0";
    document.getElementById("totalMinimaxNodes").textContent = "0";
    document.getElementById("totalAlphaBetaNodes").textContent = "0";
    document.getElementById("totalPruned").textContent = "0";

    resetGame();
    showModeSelection();
}

// ── Modal Controls ──
function closeModal() {
    resultModal.classList.remove("visible");
}
