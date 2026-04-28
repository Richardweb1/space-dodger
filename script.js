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

const GENLAYER = {
  chainId: "0x107d",
  chainName: "GenLayer Testnet Chain",
  rpcUrls: ["https://rpc.testnet-chain.genlayer.com"],
  explorer: "https://explorer.testnet-chain.genlayer.com",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  }
};

let walletAddress = null;
let isConnected = false;

let width;
let height;
let gameRunning = false;
let score = 0;
let gameTime = 0;
let startTime = 0;

const keys = {};
let asteroids = [];
let stars = [];

const player = {
  x: 100,
  y: 300,
  size: 34,
  speed: 7
};

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask first.");
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

    alert("Connected to GenLayer Testnet Chain ✅");
  } catch (err) {
    console.error(err);
    alert("Wallet connection failed.");
  }
}

function createStars() {
  stars = [];

  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2,
      speed: 0.4 + Math.random() * 1.1
    });
  }
}

function startGame() {
  if (!isConnected) {
    alert("Connect wallet first.");
    return;
  }

  resizeCanvas();

  player.x = width * 0.15;
  player.y = height / 2;

  asteroids = [];
  score = 0;
  gameTime = 0;
  startTime = Date.now();
  txStatus.textContent = "";

  createStars();

  menu.classList.add("hidden");
  gameOver.classList.add("hidden");
  canvas.style.display = "block";

  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

function drawStars() {
  ctx.fillStyle = "white";

  stars.forEach(star => {
    ctx.globalAlpha = 0.35 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();

    star.x -= star.speed;

    if (star.x < 0) {
      star.x = width;
      star.y = Math.random() * height;
    }
  });

  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00d9ff";

  ctx.fillStyle = "#00f7ff";
  ctx.beginPath();
  ctx.moveTo(player.size, 0);
  ctx.lineTo(-player.size, -player.size * 0.75);
  ctx.lineTo(-player.size * 0.45, 0);
  ctx.lineTo(-player.size, player.size * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-3, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function spawnAsteroid() {
  const size = 24 + Math.random() * 42;

  asteroids.push({
    x: width + size,
    y: Math.random() * (height - size * 2) + size,
    size,
    speed: 2 + Math.random() * 2 + score / 900,
    rotation: Math.random() * Math.PI * 2
  });
}

function drawAsteroids() {
  asteroids.forEach(a => {
    a.x -= a.speed;
    a.rotation += 0.025;

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);

    ctx.shadowBlur = 16;
    ctx.shadowColor = "#8b5cff";
    ctx.fillStyle = "#8b5cff";

    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const radius = a.size * (0.75 + Math.random() * 0.18);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  asteroids = asteroids.filter(a => a.x + a.size > 0);
}

function updatePlayer() {
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  player.x = Math.max(player.size, Math.min(width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(height - player.size, player.y));
}

function checkCollision() {
  for (const a of asteroids) {
    const dx = player.x - a.x;
    const dy = player.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.size * 0.72 + a.size * 0.72) {
      endGame();
      return;
    }
  }
}

function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, width, height);

  drawStars();
  updatePlayer();
  drawPlayer();

  if (score > 120 && Math.random() < 0.015) {
    spawnAsteroid();
  }

  drawAsteroids();
  checkCollision();

  score += 1;
  gameTime = Math.floor((Date.now() - startTime) / 1000);

  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Score: " + score, 20, 40);
  ctx.fillText("Time: " + gameTime + "s", 20, 72);

  requestAnimationFrame(gameLoop);
}

function endGame() {
  if (!gameRunning) return;

  gameRunning = false;
  canvas.style.display = "none";

  finalScoreText.textContent = score;
  finalTimeText.textContent = gameTime;

  gameOver.classList.remove("hidden");
}

async function submitScoreTransaction() {
  if (!walletAddress) {
    alert("Connect wallet first.");
    return;
  }

  try {
    txStatus.textContent = "Waiting for MetaMask signature...";

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const message =
      `SpaceDodger|Wallet:${walletAddress}|Score:${score}|Time:${gameTime}|Network:GenLayerTestnetChain`;

    const tx = await signer.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("0"),
      data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))
    });

    txStatus.innerHTML =
      `Transaction sent ✅<br>
      <a href="${GENLAYER.explorer}/tx/${tx.hash}" target="_blank">
        View TX on GenLayer Explorer
      </a>`;
  } catch (err) {
    console.error(err);
    txStatus.textContent = "Transaction cancelled or failed.";
  }
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();

  if (!gameRunning) return;

  const touch = e.touches[0];
  player.x = touch.clientX;
  player.y = touch.clientY;
}, { passive: false });

canvas.addEventListener("mousemove", e => {
  if (!gameRunning) return;

  player.x = e.clientX;
  player.y = e.clientY;
});

connectBtn.onclick = connectWallet;
startBtn.onclick = startGame;
retryBtn.onclick = startGame;
submitTxBtn.onclick = submitScoreTransaction;

menuBtn.onclick = () => {
  gameOver.classList.add("hidden");
  menu.classList.remove("hidden");
};
