// Spanish Mini Crossword Puzzles Database
const puzzles = [
    {
        // Grid: 0=black, 1=white cell
        grid: [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0]
        ],
        // Numbers: qué número aparece en cada celda (0 si no hay número)
        numbers: [
            [0, 0, 0, 0, 0],
            [0, 1, 2, 3, 0],
            [4, 0, 0, 0, 0],
            [0, 6, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ],
        answers: [
            ['', '', '', '', ''],
            ['', 'S', 'O', 'L', ''],
            ['M', 'A', 'R', 'E', 'S'],
            ['', 'A', 'L', 'O', ''],
            ['', '', '', '', '']
        ],
        across: [
            { number: 1, clue: 'Estrella brillante en el cielo', hint: 'Centro del Sistema Solar' },
            { number: 4, clue: 'Océano de agua salada', hint: 'Cubre 71% del planeta' },
            { number: 6, clue: 'Ala de un pájaro', hint: 'Los pájaros vuelan con éstas' }
        ],
        down: [
            { number: 1, clue: 'Hermanos y hermanas', hint: 'Familiares consanguíneos' },
            { number: 2, clue: 'Depósito de agua con peces', hint: 'Acuario en casa' },
            { number: 3, clue: 'Olor agradable', hint: 'Perfume o aroma dulce' },
            { number: 4, clue: 'Comida tradicional mexicana', hint: 'Se hace con maíz y relleno' }
        ]
    },
    {
        grid: [
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0]
        ],
        numbers: [
            [0, 0, 1, 0, 0],
            [0, 0, 2, 0, 0],
            [3, 4, 0, 5, 6],
            [0, 0, 7, 0, 0],
            [0, 0, 0, 0, 0]
        ],
        answers: [
            ['', '', 'P', '', ''],
            ['', '', 'A', '', ''],
            ['G', 'A', 'T', 'O', 'S'],
            ['', '', 'O', '', ''],
            ['', '', 'S', '', '']
        ],
        across: [
            { number: 3, clue: 'Animales felinos domésticos (plural)', hint: 'Mascotas que ronronean' },
        ],
        down: [
            { number: 1, clue: 'Vegetal amarillo para hacer palomitas', hint: 'Maíz tostado' },
            { number: 2, clue: 'Líquido para beber, H2O', hint: 'Esencial para la vida' },
            { number: 4, clue: 'Utensilio para comer', hint: 'Se usa con tenedor' },
            { number: 5, clue: 'Vehículo de cuatro ruedas', hint: 'Lo conduces en la carretera' },
            { number: 6, clue: 'Frutas rojas y ácidas', hint: 'Berries silvestres' },
            { number: 7, clue: 'Flor con espinas', hint: 'Símbolo de México' }
        ]
    }
];

let currentPuzzle = 0;
let userGrid = [];
let selectedCell = null;
let currentClueNumber = null;
let currentClueDirection = null;
let lastSelectedRow = null;
let lastSelectedCol = null;
let lastSelectedAcrossNumber = null;
let lastSelectedDownNumber = null;
let isNavigating = false;
let hintShown = new Set();
let inputCache = new Map(); // Cache references to all inputs for performance
let cluePositionMap = {}; // Precalculated map: {clueNumber: {across: {row, col}, down: {row, col}}}
let sortedAcrossClues = [];
let sortedDownClues = [];

function initializePuzzle() {
    const puzzle = puzzles[currentPuzzle];
    userGrid = puzzle.grid.map(row => [...row]);
    hintShown = new Set();
    inputCache.clear();
    
    // Precalculate sorted clues and position map for O(1) lookups
    sortedAcrossClues = [...puzzle.across].sort((a, b) => a.number - b.number);
    sortedDownClues = [...puzzle.down].sort((a, b) => a.number - b.number);
    
    // Build clue position map
    cluePositionMap = {};
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const num = puzzle.numbers[row][col];
            if (num > 0) {
                if (!cluePositionMap[num]) cluePositionMap[num] = {};
                // Check for across word start
                if (col === 0 || puzzle.grid[row][col - 1] === 0) {
                    if (col < 4 && puzzle.grid[row][col + 1] > 0) {
                        cluePositionMap[num].across = {row, col};
                    }
                }
                // Check for down word start
                if (row === 0 || puzzle.grid[row - 1][col] === 0) {
                    if (row < 4 && puzzle.grid[row + 1][col] > 0) {
                        cluePositionMap[num].down = {row, col};
                    }
                }
            }
        }
    }
    
    renderGrid();
    clearFeedback();
    updateClueDisplay();
}

function renderGrid() {
    const puzzle = puzzles[currentPuzzle];
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (puzzle.grid[row][col] === 0) {
                cell.classList.add('black');
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.dataset.row = row;
                input.dataset.col = col;
                input.placeholder = '';

                // Add number if it exists in the numbers grid
                const number = puzzle.numbers[row][col];
                if (number > 0) {
                    const numberSpan = document.createElement('div');
                    numberSpan.className = 'number';
                    numberSpan.textContent = number;
                    cell.appendChild(numberSpan);
                }

                input.addEventListener('input', (e) => handleInput(e, row, col));
                input.addEventListener('click', () => selectCell(input, row, col));
                input.addEventListener('keydown', (e) => handleKeydown(e, row, col));
                
                // Cache reference for performance
                const key = `${row}-${col}`;
                inputCache.set(key, input);

                cell.appendChild(input);
            }
            gridElement.appendChild(cell);
        }
    }
}

function handleInput(e, row, col) {
    const value = e.target.value.toUpperCase();
    e.target.value = value;
    userGrid[row][col] = value;

    // If cell becomes empty, clean incorrect styling
    if (!value) {
        e.target.classList.remove('incorrect');
        e.target.style.backgroundColor = 'white';
        e.target.style.backgroundImage = 'none';
    }

    if (value && !isNavigating) {
        // Move to next cell based on current direction
        let moved = false;
        if (currentClueDirection === 'down') {
            moved = moveDown(row, col);
        } else {
            // Default to across
            moved = moveToNext(row, col);
        }
        
        // If we couldn't move and there's a value, prevent further typing
        if (!moved && value) {
            // We reached the end of the word, stay here
            console.log(`At end of word at (${row},${col})`);
        }
    }

    // Check if puzzle is complete
    checkIfComplete();
}

function handleKeydown(e, row, col) {
    if (e.key === 'Backspace' && !e.target.value) {
        // Move to previous based on current direction
        if (currentClueDirection === 'down') {
            moveUp(row, col);
        } else {
            moveToPrevious(row, col);
        }
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveToNext(row, col);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveToPrevious(row, col);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveDown(row, col);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveUp(row, col);
    }
}

function moveToNext(row, col) {
    const puzzle = puzzles[currentPuzzle];
    let nextCol = col + 1;
    
    // First try to continue in the same row (within current word)
    while (nextCol < 5 && puzzle.grid[row][nextCol] > 0) {
        focusCell(row, nextCol);
        return true;
    }
    
    // If we hit a black cell, find the NEXT across clue using precalculated sorted list
    if (currentClueNumber !== null) {
        const currentClueIndex = sortedAcrossClues.findIndex(c => c.number === currentClueNumber);
        
        if (currentClueIndex >= 0 && currentClueIndex < sortedAcrossClues.length - 1) {
            const nextClueNumber = sortedAcrossClues[currentClueIndex + 1].number;
            const pos = cluePositionMap[nextClueNumber]?.across;
            if (pos) {
                focusCell(pos.row, pos.col);
                return true;
            }
        }
    }
    
    return false;
}

function moveToPrevious(row, col) {
    const puzzle = puzzles[currentPuzzle];
    let prevCol = col - 1;
    
    // First try to continue in the same row (within current word)
    while (prevCol >= 0 && puzzle.grid[row][prevCol] > 0) {
        focusCell(row, prevCol);
        return true;
    }
    
    // If we hit a black cell, find the PREVIOUS across clue using precalculated sorted list
    if (currentClueNumber !== null) {
        const currentClueIndex = sortedAcrossClues.findIndex(c => c.number === currentClueNumber);
        
        if (currentClueIndex > 0) {
            const prevClueNumber = sortedAcrossClues[currentClueIndex - 1].number;
            const pos = cluePositionMap[prevClueNumber]?.across;
            if (pos) {
                // Find last cell of this word
                let lastCol = pos.col;
                while (lastCol < 4 && puzzle.grid[pos.row][lastCol + 1] > 0) {
                    lastCol++;
                }
                focusCell(pos.row, lastCol);
                return true;
            }
        }
    }
    
    return false;
}

function moveDown(row, col) {
    const puzzle = puzzles[currentPuzzle];
    let nextRow = row + 1;
    
    // First try to continue in the same column (within current word)
    while (nextRow < 5 && puzzle.grid[nextRow][col] > 0) {
        focusCell(nextRow, col);
        return true;
    }
    
    // If we hit a black cell, find the NEXT down clue using precalculated sorted list
    if (currentClueNumber !== null) {
        const currentClueIndex = sortedDownClues.findIndex(c => c.number === currentClueNumber);
        
        if (currentClueIndex >= 0 && currentClueIndex < sortedDownClues.length - 1) {
            const nextClueNumber = sortedDownClues[currentClueIndex + 1].number;
            const pos = cluePositionMap[nextClueNumber]?.down;
            if (pos) {
                focusCell(pos.row, pos.col);
                return true;
            }
        }
    }
    
    return false;
}

function moveUp(row, col) {
    const puzzle = puzzles[currentPuzzle];
    let prevRow = row - 1;
    
    // First try to continue in the same column (within current word)
    while (prevRow >= 0 && puzzle.grid[prevRow][col] > 0) {
        focusCell(prevRow, col);
        return true;
    }
    
    // If we hit a black cell, find the PREVIOUS down clue using precalculated sorted list
    if (currentClueNumber !== null) {
        const currentClueIndex = sortedDownClues.findIndex(c => c.number === currentClueNumber);
        
        if (currentClueIndex > 0) {
            const prevClueNumber = sortedDownClues[currentClueIndex - 1].number;
            const pos = cluePositionMap[prevClueNumber]?.down;
            if (pos) {
                // Find last cell of this word
                let lastRow = pos.row;
                while (lastRow < 4 && puzzle.grid[lastRow + 1][pos.col] > 0) {
                    lastRow++;
                }
                focusCell(lastRow, pos.col);
                return true;
            }
        }
    }
    
    return false;
}

function selectCell(input, row, col, isNavigation = false) {
    const puzzle = puzzles[currentPuzzle];
    
    // Marcar la celda como seleccionada
    if (selectedCell && selectedCell !== input) {
        selectedCell.style.background = 'transparent';
    }
    selectedCell = input;
    input.focus();
    
    // Find all words that contain this cell
    const acrossNumber = findWordStart(row, col, 'across');
    const downNumber = findWordStart(row, col, 'down');
    
    // If this is navigation and we're already in a direction, preserve it
    if (isNavigation && currentClueDirection !== null) {
        if (currentClueDirection === 'across' && acrossNumber !== null) {
            // Continue horizontally
            showClueAndHighlight(acrossNumber, 'across', row, col);
            lastSelectedRow = row;
            lastSelectedCol = col;
            lastSelectedAcrossNumber = acrossNumber;
            lastSelectedDownNumber = downNumber;
            return;
        } else if (currentClueDirection === 'down' && downNumber !== null) {
            // Continue vertically
            showClueAndHighlight(downNumber, 'down', row, col);
            lastSelectedRow = row;
            lastSelectedCol = col;
            lastSelectedAcrossNumber = acrossNumber;
            lastSelectedDownNumber = downNumber;
            return;
        }
    }
    
    // User clicked - handle normally
    // Check if this is the same cell we clicked before
    const sameCell = (lastSelectedRow === row && lastSelectedCol === col);
    
    // Determine what to show
    if (acrossNumber !== null && downNumber !== null) {
        // Celda que pertenece a dos palabras
        if (sameCell && lastSelectedAcrossNumber === acrossNumber) {
            // Same cell clicked again - toggle to down
            if (currentClueDirection === 'across') {
                showClueAndHighlight(downNumber, 'down', row, col);
            } else {
                showClueAndHighlight(acrossNumber, 'across', row, col);
            }
        } else {
            // New cell - show across by default
            showClueAndHighlight(acrossNumber, 'across', row, col);
        }
    } else if (acrossNumber !== null) {
        // Solo palabra horizontal
        showClueAndHighlight(acrossNumber, 'across', row, col);
    } else if (downNumber !== null) {
        // Solo palabra vertical
        showClueAndHighlight(downNumber, 'down', row, col);
    }
    
    // Update tracking
    lastSelectedRow = row;
    lastSelectedCol = col;
    lastSelectedAcrossNumber = acrossNumber;
    lastSelectedDownNumber = downNumber;
}

function findWordStart(row, col, direction) {
    const puzzle = puzzles[currentPuzzle];
    
    if (direction === 'across') {
        // Find start of word going left
        let startCol = col;
        while (startCol > 0 && puzzle.grid[row][startCol - 1] > 0) {
            startCol--;
        }
        
        // Check if this position has a number
        if (puzzle.numbers[row][startCol] > 0) {
            // Verify there's actually a word to the right
            if (startCol < 4 && puzzle.grid[row][startCol + 1] > 0) {
                return puzzle.numbers[row][startCol];
            }
        }
    } else if (direction === 'down') {
        // Find start of word going up
        let startRow = row;
        while (startRow > 0 && puzzle.grid[startRow - 1][col] > 0) {
            startRow--;
        }
        
        // Check if this position has a number
        if (puzzle.numbers[startRow][col] > 0) {
            // Verify there's actually a word below
            if (startRow < 4 && puzzle.grid[startRow + 1][col] > 0) {
                return puzzle.numbers[startRow][col];
            }
        }
    }
    
    return null;
}

function focusCell(row, col) {
    const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
    if (input) {
        isNavigating = true;
        selectCell(input, row, col, true); // true = isNavigation
        isNavigating = false;
    }
}

function showClueAndHighlight(number, direction, currentRow, currentCol) {
    const puzzle = puzzles[currentPuzzle];
    
    // Clear previous highlights - reset all incorrect cells to white (no yellow)
    document.querySelectorAll('.cell input').forEach(input => {
        if (input.classList.contains('incorrect')) {
            // Reset to white with diagonal, no yellow background
            input.style.backgroundColor = 'white';
            const svg = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Cline x1=%220%22 y1=%220%22 x2=%22100%22 y2=%22100%22 stroke=%22red%22 stroke-width=%222%22/%3E%3C/svg%3E")';
            input.style.backgroundImage = svg;
            input.style.backgroundSize = 'cover';
            input.style.backgroundPosition = 'center';
            input.style.backgroundRepeat = 'no-repeat';
        } else {
            input.style.background = 'transparent';
        }
    });
    
    // Show the clue
    showClue(number, direction);
    
    // Highlight all cells in the selected word (including incorrect ones)
    if (direction === 'across') {
        // Find start of word
        let startCol = currentCol;
        while (startCol > 0 && puzzle.grid[currentRow][startCol - 1] > 0) {
            startCol--;
        }
        
        // Highlight all cells in the word
        let col = startCol;
        while (col < 5 && puzzle.grid[currentRow][col] > 0) {
            const input = document.querySelector(`input[data-row="${currentRow}"][data-col="${col}"]`);
            if (input) {
                // All cells in selected word get yellow background
                input.style.backgroundColor = '#fff3cd';
                // If incorrect, also add the diagonal line
                if (input.classList.contains('incorrect')) {
                    const svg = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Cline x1=%220%22 y1=%220%22 x2=%22100%22 y2=%22100%22 stroke=%22red%22 stroke-width=%222%22/%3E%3C/svg%3E")';
                    input.style.backgroundImage = svg;
                    input.style.backgroundSize = 'cover';
                    input.style.backgroundPosition = 'center';
                    input.style.backgroundRepeat = 'no-repeat';
                }
            }
            col++;
        }
    } else {
        // Highlight all cells in the down word
        let startRow = currentRow;
        while (startRow > 0 && puzzle.grid[startRow - 1][currentCol] > 0) {
            startRow--;
        }
        
        // Highlight all cells in the word
        let row = startRow;
        while (row < 5 && puzzle.grid[row][currentCol] > 0) {
            const input = document.querySelector(`input[data-row="${row}"][data-col="${currentCol}"]`);
            if (input) {
                // All cells in selected word get yellow background
                input.style.backgroundColor = '#fff3cd';
                // If incorrect, also add the diagonal line
                if (input.classList.contains('incorrect')) {
                    const svg = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Cline x1=%220%22 y1=%220%22 x2=%22100%22 y2=%22100%22 stroke=%22red%22 stroke-width=%222%22/%3E%3C/svg%3E")';
                    input.style.backgroundImage = svg;
                    input.style.backgroundSize = 'cover';
                    input.style.backgroundPosition = 'center';
                    input.style.backgroundRepeat = 'no-repeat';
                }
            }
            row++;
        }
    }
}

function showClue(number, direction) {
    const puzzle = puzzles[currentPuzzle];
    const clues = direction === 'across' ? puzzle.across : puzzle.down;
    const clue = clues.find(c => c.number === number);
    
    if (clue) {
        currentClueNumber = number;
        currentClueDirection = direction;
        const directionText = direction === 'across' ? 'Horizontal' : 'Vertical';
        const clueContent = document.getElementById('clueContent');
        clueContent.innerHTML = `
            <div class="clue-direction">${directionText}</div>
            <div><span class="clue-number">${number}.</span> ${clue.clue}</div>
        `;
    } else {
        // If clue doesn't exist in this direction, try the other direction
        if (direction === 'across') {
            showClue(number, 'down');
        }
    }
}

function updateClueDisplay() {
    const clueContent = document.getElementById('clueContent');
    clueContent.innerHTML = '<p>Haz clic en un número para ver la pista</p>';
}

function checkIfComplete() {
    const puzzle = puzzles[currentPuzzle];
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            if (puzzle.grid[row][col] > 0) {
                const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
                if (!input.value) {
                    return; // Grid not complete
                }
            }
        }
    }
    
    // Grid is complete, check if correct
    checkAnswer();
}

function checkAnswer() {
    const puzzle = puzzles[currentPuzzle];
    const feedbackElement = document.getElementById('feedback');
    let correct = true;

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            if (puzzle.grid[row][col] > 0) {
                const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
                if (input.value !== puzzle.answers[row][col]) {
                    correct = false;
                    input.style.background = '#ffcccc';
                }
            }
        }
    }

    if (correct) {
        feedbackElement.textContent = '¡Felicitaciones! ¡Completaste el mini! 🎉';
        feedbackElement.className = 'feedback success';
    }
}

function verifyAnswers() {
    const puzzle = puzzles[currentPuzzle];
    
    // Check each cell
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            if (puzzle.grid[row][col] > 0) {
                const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
                const userValue = input.value.toUpperCase();
                const correctValue = puzzle.answers[row][col];
                
                if (userValue) {
                    if (userValue === correctValue) {
                        // Mark as correct - blue text on white background
                        input.style.color = '#003DA5';
                        input.style.fontWeight = 'bold';
                        input.style.backgroundColor = 'white';
                        input.style.backgroundImage = 'none';
                        input.style.textDecoration = 'none';
                        input.disabled = true;
                        input.classList.add('correct');
                        input.classList.remove('incorrect');
                    } else {
                        // Mark as incorrect - black text with red diagonal line, WHITE background by default
                        input.style.backgroundColor = 'white';
                        input.style.color = 'black';
                        input.style.fontWeight = 'normal';
                        input.style.textDecoration = 'none';
                        input.classList.add('incorrect');
                        input.classList.remove('correct');
                        input.disabled = false;
                        
                        // Add SVG diagonal line from top-left to bottom-right
                        const svg = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Cline x1=%220%22 y1=%220%22 x2=%22100%22 y2=%22100%22 stroke=%22red%22 stroke-width=%222%22/%3E%3C/svg%3E")';
                        input.style.backgroundImage = svg;
                        input.style.backgroundSize = 'cover';
                        input.style.backgroundPosition = 'center';
                        input.style.backgroundRepeat = 'no-repeat';
                    }
                }
            }
        }
    }
}

function nextPuzzle() {
    currentPuzzle = (currentPuzzle + 1) % puzzles.length;
    
    // Clear all highlights
    document.querySelectorAll('input').forEach(input => {
        input.style.background = 'transparent';
        input.disabled = false;
        input.classList.remove('correct', 'incorrect');
    });
    
    initializePuzzle();
}

function showHint() {
    const puzzle = puzzles[currentPuzzle];
    const clueContent = document.getElementById('clueContent');
    
    // Si no hay palabra seleccionada, mostrar mensaje
    if (currentClueNumber === null || currentClueDirection === null) {
        clueContent.innerHTML = '<p style="color: #999;">Selecciona una palabra primero</p>';
        return;
    }
    
    // Crear un ID único para esta pista
    const hintId = `${currentClueNumber}-${currentClueDirection}`;
    
    // Si ya se mostró esta pista, no hacer nada
    if (hintShown.has(hintId)) {
        return;
    }
    
    // Obtener la pista
    const clues = currentClueDirection === 'across' ? puzzle.across : puzzle.down;
    const clue = clues.find(c => c.number === currentClueNumber);
    
    if (clue && clue.hint) {
        // Marcar esta pista como mostrada
        hintShown.add(hintId);
        
        // Agregar la pista debajo de la descripción existente
        const hintElement = document.createElement('div');
        hintElement.style.cssText = 'color: #0c5460; background: #d1ecf1; padding: 6px; border-radius: 4px; border-left: 3px solid #0c5460; font-size: 0.75rem; line-height: 1.1;';
        hintElement.innerHTML = `<strong>💡 Pista:</strong> "${clue.hint}"`;
        clueContent.appendChild(hintElement);
    }
}

function clearFeedback() {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.textContent = '';
    feedbackElement.className = 'feedback';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializePuzzle();

    document.getElementById('verifyBtn').addEventListener('click', verifyAnswers);
    document.getElementById('hintBtn').addEventListener('click', showHint);
});
