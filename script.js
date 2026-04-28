const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const gameOverScreen = document.getElementById("gameOver");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const hud = document.getElementById("hud");

const connectWalletBtn = document.getElementById("connectWallet");
const walletAddressText = document.getElementById("walletAddress");
const submitScoreBtn = document.getElementById("submitScoreBtn");
const txStatus = document.getElementById("txStatus");

const scoreText = document.getElementById("score");
const finalScoreText = document.getElementById("finalScore");
const highScoreText = document.getElementById("highScore");

let width, height;
let player, asteroids, stars;
let score = 0;
let finalScore = 0;
let highScore = localStorage.getItem("spaceDodgerHighScore") || 0;
let gameRunning = false;
let paused = false;
let keys = {};
let spawnTimer = 0;
let difficulty = 1;

let provider;
let signer;
let userAddress;

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask first.");
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);
    await switchToBaseSepolia();

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    walletAddressText.textContent =
      "Connected: " + userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
  } catch (error) {
    console.error(error);
    walletAddressText.textContent = "Wallet connection failed.";
  }
}

async function switchToBaseSepolia() {
  const baseSepoliaChainId = "0x14a34";

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: baseSepoliaChainId }]
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: baseSepoliaChainId,
          chainName: "Base Sepolia",
          nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18
          },
          rpcUrls: ["https://sepolia.base.org"],
          blockExplorerUrls: ["https://sepolia.basescan.org"]
        }]
      });
    } else {
      throw switchError;
    }
  }
}

async function submitScoreOnChain() {
  if (!signer || !userAddress) {
    alert("Connect your wallet first.");
    return;
  }

  try {
    txStatus.textContent = "Submitting score to Base Sepolia...";

    const message = `Space Dodger Score: ${finalScore}`;

    const tx = await signer.sendTransaction({
      to: userAddress,
      value: 0,
      data: ethers.hexlify(ethers.toUtf8Bytes(message))
    });

    txStatus.innerHTML =
      `Score submitted! TX: <br>${tx.hash}<br><br>
      View on BaseScan:<br>
      https://sepolia.basescan.org/tx/${tx.hash}`;
  } catch (error) {
    console.error(error);
    txStatus.textContent = "Transaction failed or cancelled.";
  }
}

function createPlayer() {
  return {
    x: width / 2,
    y: height - 90,
    size: 26,
    speed: 7
  };
}

function createStars() {
  stars = [];

  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2,
      speed: 0.5 + Math.random() * 1.5
    });
  }
}

function startGame() {
  player = createPlayer();
  asteroids = [];
  score = 0;
  difficulty = 1;
  spawnTimer = 0;
  paused = false;
  gameRunning = true;

  menu.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  hud.style.display = "flex";
  pauseBtn.textContent = "Pause";
  txStatus.textContent = "";

  createStars();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  hud.style.display = "none";

  finalScore = Math.floor(score);

  if (finalScore > highScore) {
    highScore = finalScore;
    localStorage.setItem("spaceDodgerHighScore", highScore);
  }

  finalScoreText.textContent = finalScore;
  highScoreText.textContent = Math.floor(highScore);
  gameOverScreen.classList.remove("hidden");
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00d9ff";

  ctx.fillStyle = "#00d9ff";
  ctx.beginPath();
  ctx.moveTo(0, -player.size);
  ctx.lineTo(player.size * 0.8, player.size);
  ctx.lineTo(0, player.size * 0.5);
  ctx.lineTo(-player.size * 0.8, player.size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStars() {
  ctx.fillStyle = "white";

  stars.forEach(star => {
    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();

    star.y += star.speed;

    if (star.y > height) {
      star.y = 0;
      star.x = Math.random() * width;
    }
  });

  ctx.globalAlpha = 1;
}

function spawnAsteroid() {
  const size = 22 + Math.random() * 35;

  asteroids.push({
    x: Math.random() * (width - size),
    y: -size,
    size,
    speed: 2 + difficulty + Math.random() * 2
  });
}

function drawAsteroids() {
  asteroids.forEach(a => {
    ctx.save();

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff6b6b";
    ctx.fillStyle = "#8b5e3c";

    ctx.beginPath();
    ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5c3b25";
    ctx.beginPath();
    ctx.arc(
      a.x - a.size * 0.3,
      a.y - a.size * 0.2,
      a.size * 0.18,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

    a.y += a.speed;
  });

  asteroids = asteroids.filter(a => a.y < height + a.size);
}

function updatePlayer() {
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;

  player.x = Math.max(player.size, Math.min(width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(height - player.size, player.y));
}

function checkCollision() {
  for (let a of asteroids) {
    const dx = player.x - a.x;
    const dy = player.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.size + a.size * 0.8) {
      endGame();
      return;
    }
  }
}

function gameLoop() {
  if (!gameRunning) return;

  if (paused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, width, height);

  drawStars();
  updatePlayer();
  drawPlayer();

  spawnTimer++;

  if (spawnTimer > Math.max(18, 55 - difficulty * 3)) {
    spawnAsteroid();
    spawnTimer = 0;
  }

  drawAsteroids();
  checkCollision();

  score += 0.1;
  difficulty += 0.0015;

  scoreText.textContent = Math.floor(score);

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

canvas.addEventListener(
  "touchmove",
  e => {
    e.preventDefault();

    if (!player) return;

    const touch = e.touches[0];
    player.x = touch.clientX;
    player.y = touch.clientY;
  },
  { passive: false }
);

connectWalletBtn.addEventListener("click", connectWallet);
submitScoreBtn.addEventListener("click", submitScoreOnChain);
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});
