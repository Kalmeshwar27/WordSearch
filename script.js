const wordColors = {};
const colorPalette = [
  "#4caf50", "#f44336", "#2196f3", "#9c27b0", "#ff9800",
  "#00bcd4", "#e91e63", "#3f51b5", "#009688", "#795548",
  "#ff5722", "#673ab7", "#607d8b", "#8bc34a", "#cddc39", "#ffc107",
  "#00acc1", "#8e24aa", "#c62828", "#1e88e5"
];

function assignColors(words) {
  let colorIndex = 0;
  words.forEach(word => {
    const key = word.toLowerCase();
    if (!wordColors[key]) {
      wordColors[key] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
  });
}

let seed = new Date().toDateString().split("").reduce((a, c) => a + c.charCodeAt(0), 0);
function seededRandom() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

let words = [];
let gridRows = 12;
let gridCols = 12;

const gridElement = document.getElementById("grid");
const wordListElement = document.getElementById("wordList");
let grid = [];
let cells = [];
let selectedCells = [];
let isMouseDown = false;
let startCell = null;
let currentDirection = null;

function createEmptyGrid() {
  grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(""));
}

function fillGridRandomly() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (grid[row][col] === "") {
        grid[row][col] = letters[Math.floor(seededRandom() * letters.length)];
      }
    }
  }
}

function directions() {
  return [
    [0, 1],   // → left to right
    [1, 0],   // ↓ top to bottom
    [1, 1],   // ↘ diagonal from top-left to bottom-right
    [1, -1]   // ↙ diagonal from top-right to bottom-left
  ];
}

function canPlace(word, row, col, dx, dy) {
  for (let i = 0; i < word.length; i++) {
    const x = row + dx * i;
    const y = col + dy * i;
    if (x < 0 || y < 0 || x >= gridRows || y >= gridCols) return false;

    const cellChar = grid[x][y];
    const wordChar = word[i]; // Already uppercase from .toUpperCase()

    if (cellChar !== "" && cellChar !== wordChar) return false; // ✅ Allow overlap only if same letter
  }
  return true;
}

function placeWord(word) {
  const allDirections = directions();
  const options = [];

  // First pass: overlap-aware smart placement
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      for (const [dx, dy] of allDirections) {
        if (canPlace(word, row, col, dx, dy)) {
          let overlap = 0;
          for (let i = 0; i < word.length; i++) {
            const x = row + dx * i;
            const y = col + dy * i;
            if (grid[x][y] === word[i]) overlap++;
          }
          options.push({ row, col, dx, dy, overlap });
        }
      }
    }
  }

  // Sort to place words with the most overlap first
  options.sort((a, b) => b.overlap - a.overlap);

  // Place using best option
  if (options.length > 0) {
    const { row, col, dx, dy } = options[0];
    for (let i = 0; i < word.length; i++) {
      const x = row + dx * i;
      const y = col + dy * i;
      grid[x][y] = word[i];
    }
    return;
  }

  // Absolute fallback: try every direction and every cell (no randomness)
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      for (const [dx, dy] of allDirections) {
        if (canPlace(word, row, col, dx, dy)) {
          for (let i = 0; i < word.length; i++) {
            const x = row + dx * i;
            const y = col + dy * i;
            grid[x][y] = word[i];
          }
          return;
        }
      }
    }
  }

  // Still not placed? Extremely rare. Log clearly.
  console.warn(`🚨 Could not place word: ${word}`);
  const li = document.getElementById(word.toLowerCase());
  if (li) li.style.color = "red";
}

function placeAllWords() {
  createEmptyGrid();

  // Sort words by length (longest first improves chances)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  const success = tryPlaceWords(sortedWords, 0);

  if (!success) {
    alert("❌ Could not place all words. This should rarely happen.");
  }
}

function tryPlaceWords(wordList, index) {
  if (index >= wordList.length) return true; // ✅ All words placed

  const word = wordList[index].toUpperCase();
  const positions = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      for (const [dx, dy] of directions()) {
        if (canPlace(word, row, col, dx, dy)) {
          positions.push({ row, col, dx, dy });
        }
      }
    }
  }

  // Optional shuffle for variety (preserves seed-based randomness)
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (const pos of positions) {
    const placedCells = [];

    for (let i = 0; i < word.length; i++) {
      const x = pos.row + pos.dx * i;
      const y = pos.col + pos.dy * i;
      placedCells.push({ x, y, prev: grid[x][y] });
      grid[x][y] = word[i];
    }

    if (tryPlaceWords(wordList, index + 1)) return true;

    // ❌ Backtrack
    for (const cell of placedCells) {
      grid[cell.x][cell.y] = cell.prev;
    }
  }

  return false;
}

function buildGridUI() {
  gridElement.innerHTML = "";
  cells = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.textContent = grid[row][col];
      cell.dataset.row = row;
      cell.dataset.col = col;

      cell.addEventListener("mousedown", handleStart);
      cell.addEventListener("touchstart", handleStart, { passive: false });

      cell.addEventListener("mouseenter", handleMove);
      cell.addEventListener("touchmove", handleMove, { passive: false });

      cell.addEventListener("mouseup", handleEnd);
      cell.addEventListener("touchend", handleEnd);

      gridElement.appendChild(cell);
      cells.push(cell);
    }
  }

  document.addEventListener("mouseup", () => {
    isMouseDown = false;
  });
}

function handleStart(e) {
  e.preventDefault();
  isMouseDown = true;
  resetSelection();

  const cell = e.target;
  startCell = cell;
  cell.classList.add("selected");
  selectedCells = [cell];
}

function handleMove(e) {
  if (!isMouseDown || !startCell) return;

  const touch = e.touches ? e.touches[0] : null;
  const target = touch
    ? document.elementFromPoint(touch.clientX, touch.clientY)
    : e.target;

  if (!target || !target.classList.contains("cell")) return;

  const startRow = parseInt(startCell.dataset.row);
  const startCol = parseInt(startCell.dataset.col);
  const currentRow = parseInt(target.dataset.row);
  const currentCol = parseInt(target.dataset.col);

  const dx = currentRow - startRow;
  const dy = currentCol - startCol;

  const length = Math.max(Math.abs(dx), Math.abs(dy));
  if (length === 0) return;

  const normDx = dx / length;
  const normDy = dy / length;

  if (!Number.isInteger(normDx) || !Number.isInteger(normDy)) return;

  const path = [];

  for (let i = 0; i <= length; i++) {
    const row = startRow + normDx * i;
    const col = startCol + normDy * i;

    const cellInPath = cells.find(
      c => parseInt(c.dataset.row) === row && parseInt(c.dataset.col) === col
    );

    if (!cellInPath) return;

    path.push(cellInPath);
  }

  // ✅ Reset previous selection and apply new one (even if it includes `.found` cells)
  selectedCells.forEach(c => c.classList.remove("selected"));
  selectedCells = path;
  selectedCells.forEach(c => {
    if (!c.classList.contains("found")) {
      c.classList.add("selected");
    }
  });
}

function handleEnd(e) {
  isMouseDown = false;
  checkWord();
}

function populateWordList() {
  wordListElement.innerHTML = "";
  words.forEach(word => {
    const li = document.createElement("li");
    li.textContent = word;
    li.id = word.toLowerCase();
    wordListElement.appendChild(li);
  });
}

function resetSelection() {
  selectedCells.forEach(cell => {
    if (!cell.classList.contains("found")) {
      cell.classList.remove("selected");
    }
  });
  selectedCells = [];
}

function checkWord() {
  const selectedWord = selectedCells.map(c => c.textContent).join("");
  const reversed = selectedWord.split("").reverse().join("");
  const match = words.find(word =>
    word.toLowerCase() === selectedWord.toLowerCase()
  );

  if (match) {
    const color = wordColors[match.toLowerCase()] || "#4caf50";

    selectedCells.forEach(c => {
      c.classList.remove("selected");
      c.classList.add("found");

      // ✅ Store overlapping words using data attribute
      const existing = c.dataset.words ? c.dataset.words.split(",") : [];
      if (!existing.includes(match)) {
        existing.push(match);
        c.dataset.words = existing.join(",");
      }

      // ✅ Set color (you could make this fancier if you want)
      c.style.backgroundColor = color;
      c.style.color = "white";
    });

    // ✅ Strike through the word in the list
    document.getElementById(match.toLowerCase()).classList.add("found");

    // ✅ Play success sound
    const sound = document.getElementById("successSound");
    if (sound) {
      sound.play().catch(err => {
        console.warn("Sound play blocked until user interacts:", err);
      });
    }

    // ✅ Check for completion
    const allFound = words.every(word =>
      document.getElementById(word.toLowerCase()).classList.contains("found")
    );
    if (allFound) confetti();

  } else {
    // Revert if not matched
    setTimeout(() => resetSelection(), 300);
  }
}

function revealWord() {
  const unfound = words.filter(w => !document.getElementById(w.toLowerCase()).classList.contains("found"));
  if (unfound.length === 0) return;

  const word = unfound[0].toUpperCase();

  // Find the word in the grid
  for (const [dx, dy] of directions()) {
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        let match = true;
        const path = [];

        for (let i = 0; i < word.length; i++) {
          const x = row + dx * i;
          const y = col + dy * i;
          if (
            x < 0 || y < 0 || x >= gridRows || y >= gridCols ||
            grid[x][y] !== word[i]
          ) {
            match = false;
            break;
          }
          const cell = cells.find(c => parseInt(c.dataset.row) === x && parseInt(c.dataset.col) === y);
          if (cell) path.push(cell);
        }

        if (match) {
          path.forEach(c => {
            c.classList.add("found");
            c.style.backgroundColor = "#4caf50"; // default green
            c.style.color = "white";
          });
          document.getElementById(word.toLowerCase()).classList.add("found");
          return;
        }
      }
    }
  }
}

function canReveal(word, row, col, dx, dy) {
  for (let i = 0; i < word.length; i++) {
    const x = row + dx * i;
    const y = col + dy * i;
    if (x < 0 || y < 0 || x >= gridRows || y >= gridCols) return false;
    if (grid[x][y] !== word[i]) return false;
  }
  return true;
}

function startGame(wordList) {
  words = wordList.map(w => w.toUpperCase());
  assignColors(words);
  createEmptyGrid();
  placeAllWords();
  fillGridRandomly();
  buildGridUI();
  populateWordList();
}

fetch("config.json")
  .then(res => {
    if (!res.ok) throw new Error("Config load failed!");
    return res.json();
  })
  .then(config => {
    const words = config.words;
    gridRows = config.rows;
    gridCols = config.cols;
    const gridStyle = document.querySelector(".grid").style;
    gridStyle.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
    gridStyle.gridTemplateRows = `repeat(${gridRows}, 1fr)`;

    startGame(words);
  })
  .catch(err => {
    console.error("❌ Failed to load puzzle configuration:", err);
    alert("Could not load puzzle settings. See console.");
  });