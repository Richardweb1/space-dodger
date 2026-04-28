// Game variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const gameOver = document.getElementById("gameOver");

let gameRunning = false;
let score = 0;
let gameTime = 0;
let startTime;
let walletAddress = null;
let isConnected = false;

// GenLayer Testnet Bradbury
const GENLAYER_TESTNET = {
  chainId: "0x107d", // 4221
  chainName: "GenLayer Testnet Bradbury",
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"]
};

// Player
const player = {
  x: 0,
  y: 0,
  width: 50,
  height: 60,
  speed: 6
};

let obstacles = [];
const keys = {};

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#00d9ff";

  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(-20, 26);
  ctx.lineTo(-7, 14);
  ctx.lineTo(0, -8);
  ctx.lineTo(7, 14);
  ctx.lineTo(20, 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#050816";
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(-6, 13);
  ctx.lineTo(6, 13);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function createObstacle() {
  const size = 30 + Math.random() * 40;
  obstacles.push({
    x: canvas.width,
    y: Math.random() * (canvas.height - size),
    width: size,
    height: size,
    speed: 3 + Math.random() * 2,
    rotation: Math.random() * Math.PI * 2
  });
}

function drawObstacle(obs) {
  ctx.save();
  ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
  ctx.rotate(obs.rotation);

  ctx.fillStyle = "#8b5cff";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#8b5cff";

  ctx.beginPath();
  ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function gameLoop() {
  if (!gameRunning) return;

  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 60; i++) {
    const x = (i * 123) % canvas.width;
    const y = (i * 456) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }

  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  drawPlayer();

  if (Math.random() < 0.02) createObstacle();

  obstacles.forEach((obs, index) => {
    obs.x -= obs.speed;
    obs.rotation += 0.02;
    drawObstacle(obs);

    if (checkCollision(player, obs)) {
      endGame();
    }

    if (obs.x + obs.width < 0) {
      obstacles.splice(index, 1);
      score += 10;
    }
  });

  gameTime = Math.floor((Date.now() - startTime) / 1000);

  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("Time: " + gameTime + "s", 20, 70);

  requestAnimationFrame(gameLoop);
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask first.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    walletAddress = accounts[0];

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER_TESTNET.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_TESTNET]
        });
      } else {
        throw switchError;
      }
    }

    isConnected = true;

    const connectBtn = document.getElementById("connectBtn");
    connectBtn.setAttribute("title", "Connected");

    console.log("Connected wallet:", walletAddress);
  } catch (error) {
    console.error(error);
    alert("Wallet connection failed. Please try again.");
  }
}

function startGame() {
  if (!isConnected) {
    alert("Please connect your wallet first.");
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  player.x = 100;
  player.y = canvas.height / 2 - player.height / 2;

  score = 0;
  gameTime = 0;
  obstacles = [];
  startTime = Date.now();

  menu.style.display = "none";
  gameOver.style.display = "none";
  canvas.style.display = "block";

  gameRunning = true;
  gameLoop();
}

function endGame() {
  gameRunning = false;
  canvas.style.display = "none";
  gameOver.style.display = "flex";

  document.getElementById("finalScore").textContent = "Score: " + score;
  document.getElementById("finalTime").textContent = "Time: " + gameTime + "s";
  document.getElementById("tx").textContent =
    "Demo only: score ready for future GenLayer validation.";
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const touch = e.touches[0];
  player.y = touch.clientY - player.height / 2;
}, { passive: false });

document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("retryBtn").addEventListener("click", startGame);

document.getElementById("menuBtn").addEventListener("click", () => {
  gameOver.style.display = "none";
  menu.style.display = "block";
});

window.addEventListener("resize", () => {
  if (gameRunning) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
