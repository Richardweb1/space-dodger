const home = document.getElementById("home");
const game = document.getElementById("game");
const result = document.getElementById("result");
const boardEl = document.getElementById("board");

const usernameInput = document.getElementById("username");
const walletText = document.getElementById("walletText");

const playerNameEl = document.getElementById("playerName");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const targetEl = document.getElementById("target");
const movesEl = document.getElementById("moves");

const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const txStatus = document.getElementById("txStatus");

const SIZE = 8;
const TILES = ["🚀", "💎", "🪐", "⭐", "🌙", "☄️"];

let board = [];
let selected = null;
let level = 1;
let score = 0;
let target = 100;
let moves = 20;
let paused = false;
let walletAddress = null;
let finalResult = "";

const GENLAYER = {
  chainId: "0x107d",
  chainName: "GenLayer Testnet Bradbury",
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  explorer: "https://explorer-bradbury.genlayer.com",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  }
};

function randTile() {
  return TILES[Math.floor(Math.random() * TILES.length)];
}

function setupLevel() {
  target = 100 + (level - 1) * 80;
  moves = Math.max(10, 22 - Math.floor(level / 3));
  score = 0;
  selected = null;
  paused = false;

  createBalancedBoard();
  updateUI();
  renderBoard();
}

function createBalancedBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let tile;
      do {
        tile = randTile();
      } while (
        (c >= 2 && board[r][c - 1] === tile && board[r][c - 2] === tile) ||
        (r >= 2 && board[r - 1][c] === tile && board[r - 2][c] === tile)
      );
      board[r][c] = tile;
    }
  }

  if (!hasPossibleMove()) createBalancedBoard();
}

function updateUI() {
  playerNameEl.textContent = usernameInput.value.trim() || "Guest";
  levelEl.textContent = level;
  scoreEl.textContent = score;
  targetEl.textContent = target;
  movesEl.textContent = moves;
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = board[r][c];
      tile.dataset.r = r;
      tile.dataset.c = c;

      if (selected && selected.r === r && selected.c === c) {
        tile.classList.add("selected");
      }

      tile.addEventListener("click", () => selectTile(r, c));
      tile.addEventListener("touchstart", e => {
        e.preventDefault();
        selectTile(r, c);
      }, { passive: false });

      boardEl.appendChild(tile);
    }
  }
}

function selectTile(r, c) {
  if (paused || moves <= 0) return;

  if (!selected) {
    selected = { r, c };
    renderBoard();
    return;
  }

  if (selected.r === r && selected.c === c) {
    selected = null;
    renderBoard();
    return;
  }

  if (isAdjacent(selected, { r, c })) {
    swapAndCheck(selected, { r, c });
  } else {
    selected = { r, c };
    renderBoard();
  }
}

function isAdjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

async function swapAndCheck(a, b) {
  swap(a, b);
  renderBoard();

  const matches = findMatches();

  if (matches.size === 0) {
    setTimeout(() => {
      swap(a, b);
      selected = null;
      renderBoard();
    }, 180);
    return;
  }

  moves--;
  selected = null;
  await resolveBoard();

  if (!hasPossibleMove()) {
    createBalancedBoard();
  }

  updateUI();
  renderBoard();
  checkLevelEnd();
}

function swap(a, b) {
  const temp = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = temp;
}

function findMatches() {
  const matched = new Set();

  for (let r = 0; r < SIZE; r++) {
    let count = 1;
    for (let c = 1; c <= SIZE; c++) {
      if (c < SIZE && board[r][c] === board[r][c - 1]) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = c - count; k < c; k++) matched.add(`${r},${k}`);
        }
        count = 1;
      }
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let count = 1;
    for (let r = 1; r <= SIZE; r++) {
      if (r < SIZE && board[r][c] === board[r - 1][c]) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = r - count; k < r; k++) matched.add(`${k},${c}`);
        }
        count = 1;
      }
    }
  }

  return matched;
}

async function resolveBoard() {
  let matches = findMatches();

  while (matches.size > 0) {
    const count = matches.size;
    let points = count * 10;

    if (count >= 4) points *= 2;
    if (count >= 5) points += 150;

    score += points;

    document.querySelectorAll(".tile").forEach(tile => {
      const key = `${tile.dataset.r},${tile.dataset.c}`;
      if (matches.has(key)) tile.classList.add("blast");
    });

    await wait(220);

    matches.forEach(key => {
      const [r, c] = key.split(",").map(Number);
      board[r][c] = null;
    });

    applyGravity();
    fillBoard();

    updateUI();
    renderBoard();

    await wait(160);
    matches = findMatches();
  }
}

function applyGravity() {
  for (let c = 0; c < SIZE; c++) {
    const column = [];

    for (let r = SIZE - 1; r >= 0; r--) {
      if (board[r][c]) column.push(board[r][c]);
    }

    for (let r = SIZE - 1; r >= 0; r--) {
      board[r][c] = column[SIZE - 1 - r] || null;
    }
  }
}

function fillBoard() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) board[r][c] = randTile();
    }
  }
}

function hasPossibleMove() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const dirs = [[0, 1], [1, 0]];

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;

        if (nr < SIZE && nc < SIZE) {
          swap({ r, c }, { r: nr, c: nc });
          const has = findMatches().size > 0;
          swap({ r, c }, { r: nr, c: nc });

          if (has) return true;
        }
      }
    }
  }

  return false;
}

function checkLevelEnd() {
  if (score >= target) {
    finalResult = "WIN";
    showResult(true);
  } else if (moves <= 0) {
    finalResult = "LOSE";
    showResult(false);
  }
}

function showResult(win) {
  game.classList.add("hidden");
  result.classList.remove("hidden");
  txStatus.textContent = "";

  resultTitle.textContent = win ? "Level Complete 🎉" : "Try Again";
  resultText.textContent =
    `Level ${level} | Score ${score} | Target ${target} | Result: ${finalResult}`;

  document.getElementById("nextLevel").style.display =
    win && level < 30 ? "inline-block" : "none";
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask first.");
    return;
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    walletAddress = accounts[0];

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER.chainId }]
      });
    } catch (err) {
      if (err.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER]
        });
      } else {
        throw err;
      }
    }

    walletText.textContent =
      "Connected: " + walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
  } catch (err) {
    alert("Wallet connection failed.");
  }
}

async function submitScoreTx() {
  if (!walletAddress) {
    alert("Connect wallet first.");
    return;
  }

  try {
    txStatus.textContent = "Waiting for signature...";

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const message =
      `CrystalPopQuest|Player:${usernameInput.value || "Guest"}|Level:${level}|Score:${score}|Target:${target}|Result:${finalResult}`;

    const tx = await signer.sendTransaction({
      to: walletAddress,
      value: 0,
      data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))
    });

    txStatus.innerHTML =
      `Score submitted!<br><a target="_blank" href="${GENLAYER.explorer}/tx/${tx.hash}">View TX</a>`;
  } catch (err) {
    txStatus.textContent = "Transaction cancelled or failed.";
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

document.getElementById("connectWallet").onclick = connectWallet;

document.getElementById("startGame").onclick = () => {
  home.classList.add("hidden");
  game.classList.remove("hidden");
  level = 1;
  setupLevel();
};

document.getElementById("nextLevel").onclick = () => {
  level++;
  result.classList.add("hidden");
  game.classList.remove("hidden");
  setupLevel();
};

document.getElementById("retryLevel").onclick = () => {
  result.classList.add("hidden");
  game.classList.remove("hidden");
  setupLevel();
};

document.getElementById("submitTx").onclick = submitScoreTx;

document.getElementById("homeBtn").onclick = () => {
  game.classList.add("hidden");
  home.classList.remove("hidden");
};

document.getElementById("backHome").onclick = () => {
  result.classList.add("hidden");
  home.classList.remove("hidden");
};

document.getElementById("pauseBtn").onclick = () => {
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "Resume" : "Pause";
};
