// ─── GenLayer Contract Config ─────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0xb1925DcD882c76bA94AdeB47D313748FA3ef480c";
const GENLAYER_RPC = "https://rpc.testnet-chain.genlayer.com";

// ─── Canvas & UI ──────────────────────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const gameOver = document.getElementById("gameOver");

const connectBtn = document.getElementById("connectBtn");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const menuBtn = document.getElementById("menuBtn");
const submitTxBtn = document.getElementById("submitTxBtn");

const walletText = document.getElementById("walletText");
const finalScoreText = document.getElementById("finalScore");
const finalTimeText = document.getElementById("finalTime");
const txStatus = document.getElementById("txStatus");

// ─── GenLayer Chain Config ─────────────────────────────────────────────────────
const GENLAYER = {
  chainId: "0x107d",
  chainName: "GenLayer Testnet Chain",
  rpcUrls: ["https://rpc.testnet-chain.genlayer.com"],
  explorer: "https://explorer.testnet-chain.genlayer.com",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }
};

// ─── Game State ────────────────────────────────────────────────────────────────
let walletAddress = null;
let isConnected = false;
let width, height;
let gameRunning = false;
let score = 0;
let gameTime = 0;
let startTime = 0;
let asteroidsAvoided = 0;   // ← NEW: tracks dodged asteroids for contract
let baseObstacleSpeed = 5;  // ← NEW: adjusted by AI difficulty tier

let roadOffset = 0;
let obstacles = [];
const keys = {};

const player = {
  x: 0,
  y: 0,
  width: 54,
  height: 70,
  speed: 8
};

// ─── Canvas Setup ──────────────────────────────────────────────────────────────
function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ─── GenLayer: Read difficulty tier from contract ──────────────────────────────
async function loadDifficultyTier() {
  try {
    const res = await fetch(GENLAYER_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "gen_call",
        params: [CONTRACT_ADDRESS, "get_difficulty_tier", [], "latest"]
      })
    });
    const data = await res.json();
    const tier = data.result;

    // AI-determined difficulty adjusts obstacle speed
    if      (tier === "easy")   baseObstacleSpeed = 3;
    else if (tier === "normal") baseObstacleSpeed = 5;
    else if (tier === "hard")   baseObstacleSpeed = 7;
    else if (tier === "chaos")  baseObstacleSpeed = 10;

    document.getElementById("difficultyText").textContent = `AI Difficulty: ${tier}`;
    console.log(`AI difficulty tier loaded: ${tier} (speed: ${baseObstacleSpeed})`);
  } catch (e) {
    console.log("Could not load difficulty from contract, using default.");
  }
}

// ─── GenLayer: Submit score to contract for AI validation ─────────────────────
async function submitScoreTransaction() {
  if (!walletAddress) {
    txStatus.textContent = "Connect wallet first.";
    return;
  }

  try {
    txStatus.textContent = "Submitting score for AI validation...";

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER.chainId }]
    });

    // Encode the contract call as JSON calldata (GenLayer format)
    const survivalMs = gameTime * 1000;
    const callData = JSON.stringify({
      method: "submit_score",
      args: [
        score.toString(),
        survivalMs.toString(),
        asteroidsAvoided.toString(),
        "0"   // power_ups (not yet in game — extend later)
      ]
    });

    const encoded = "0x" + Array.from(new TextEncoder().encode(callData))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: walletAddress,
        to: CONTRACT_ADDRESS,
        value: "0x0",
        data: encoded
      }]
    });

    txStatus.innerHTML =
      `Score submitted for AI validation ✅<br>
       Validators are reviewing your run...<br>
       <a href="${GENLAYER.explorer}/tx/${txHash}" target="_blank">
         View TX on GenLayer Explorer
       </a>`;

  } catch (err) {
    console.error(err);
    txStatus.textContent = "Submission failed. Make sure you have GEN testnet gas.";
  }
}

// ─── Wallet Connection ─────────────────────────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask first.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    walletAddress = accounts[0];

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER.chainId }]
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: GENLAYER.chainId,
            chainName: GENLAYER.chainName,
            rpcUrls: GENLAYER.rpcUrls,
            nativeCurrency: GENLAYER.nativeCurrency,
            blockExplorerUrls: [GENLAYER.explorer]
          }]
        });
      } else {
        throw err;
      }
    }

    isConnected = true;
    walletText.textContent =
      "Connected: " + walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);

  } catch (err) {
    console.error(err);
    alert("Wallet connection failed.");
  }
}

// ─── Game Start ────────────────────────────────────────────────────────────────
async function startGame() {
  if (!isConnected) {
    alert("Connect wallet first.");
    return;
  }

  resizeCanvas();

  player.x = width / 2 - player.width / 2;
  player.y = height - 110;

  score = 0;
  gameTime = 0;
  roadOffset = 0;
  obstacles = [];
  asteroidsAvoided = 0;  // ← reset counter
  startTime = Date.now();
  txStatus.textContent = "";

  // ← NEW: load AI difficulty before game begins
  await loadDifficultyTier();

  menu.classList.add("hidden");
  gameOver.classList.add("hidden");
  canvas.style.display = "block";

  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

// ─── Drawing ───────────────────────────────────────────────────────────────────
function drawRoad() {
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, width, height);

  const roadWidth = Math.min(520, width * 0.82);
  const roadX = width / 2 - roadWidth / 2;

  ctx.fillStyle = "#111936";
  ctx.fillRect(roadX, 0, roadWidth, height);

  ctx.strokeStyle = "rgba(0, 217, 255, 0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(roadX, 0);
  ctx.lineTo(roadX, height);
  ctx.moveTo(roadX + roadWidth, 0);
  ctx.lineTo(roadX + roadWidth, height);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 5;
  ctx.setLineDash([35, 35]);
  ctx.lineDashOffset = -roadOffset;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);

  roadOffset += 8;
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00d9ff";
  ctx.fillStyle = "#00f7ff";
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(-27, 35);
  ctx.lineTo(0, 18);
  ctx.lineTo(27, 35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(0, -5, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spawnObstacle() {
  const roadWidth = Math.min(520, width * 0.82);
  const roadX = width / 2 - roadWidth / 2;
  const size = 42 + Math.random() * 35;

  obstacles.push({
    x: roadX + Math.random() * (roadWidth - size),
    y: -size,
    size,
    // ← uses baseObstacleSpeed set by AI difficulty tier
    speed: baseObstacleSpeed + Math.random() * 2 + score / 900,
    counted: false  // ← NEW: avoids double-counting
  });
}

function drawObstacles() {
  obstacles.forEach(o => {
    o.y += o.speed;

    // ← NEW: count as avoided when it passes the player
    if (!o.counted && o.y > player.y + player.height) {
      asteroidsAvoided++;
      o.counted = true;
    }

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#8b5cff";
    ctx.fillStyle = "#8b5cff";
    ctx.beginPath();
    ctx.arc(o.x + o.size / 2, o.y + o.size / 2, o.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  obstacles = obstacles.filter(o => o.y < height + o.size);
}

function updatePlayer() {
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  const roadWidth = Math.min(520, width * 0.82);
  const roadX = width / 2 - roadWidth / 2;
  player.x = Math.max(roadX, Math.min(roadX + roadWidth - player.width, player.x));
}

function checkCollision() {
  for (const o of obstacles) {
    if (
      player.x < o.x + o.size &&
      player.x + player.width > o.x &&
      player.y < o.y + o.size &&
      player.y + player.height > o.y
    ) {
      endGame();
      return;
    }
  }
}

// ─── Game Loop ─────────────────────────────────────────────────────────────────
function gameLoop() {
  if (!gameRunning) return;

  drawRoad();
  updatePlayer();
  drawPlayer();

  if (score > 80 && Math.random() < 0.025) spawnObstacle();

  drawObstacles();
  checkCollision();

  score++;
  gameTime = Math.floor((Date.now() - startTime) / 1000);

  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("Time: " + gameTime + "s", 20, 72);
  ctx.fillText("Dodged: " + asteroidsAvoided, 20, 104); // ← show counter in-game

  requestAnimationFrame(gameLoop);
}

// ─── Game Over ─────────────────────────────────────────────────────────────────
async function endGame() {
  if (!gameRunning) return;

  gameRunning = false;
  canvas.style.display = "none";

  finalScoreText.textContent = score;
  finalTimeText.textContent = gameTime;
  document.getElementById("finalDodged").textContent = asteroidsAvoided;

  gameOver.classList.remove("hidden");

  await submitScoreTransaction();
}

// ─── Event Listeners ───────────────────────────────────────────────────────────
window.addEventListener("keydown", e => { keys[e.key] = true; });
window.addEventListener("keyup",   e => { keys[e.key] = false; });

connectBtn.onclick  = connectWallet;
startBtn.onclick    = startGame;
retryBtn.onclick    = startGame;
submitTxBtn.onclick = submitScoreTransaction;
menuBtn.onclick = () => {
  gameOver.classList.add("hidden");
  menu.classList.remove("hidden");
};
