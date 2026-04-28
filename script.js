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

const GENLAYER = {
  chainId: "0x107d",
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  explorer: "https://explorer-bradbury.genlayer.com"
};

const player = {
  x: 100,
  y: 300,
  width: 50,
  height: 60,
  speed: 7
};

let obstacles = [];
const keys = {};

async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask first");
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
    } catch {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: GENLAYER.chainId,
          chainName: "GenLayer Testnet",
          rpcUrls: GENLAYER.rpcUrls,
          nativeCurrency: {
            name: "GEN",
            symbol: "GEN",
            decimals: 18
          }
        }]
      });
    }

    isConnected = true;
    alert("Connected to GenLayer Testnet");
  } catch (error) {
    alert("Wallet connection failed");
  }
}

function startGame() {
  if (!isConnected) {
    alert("Connect wallet first");
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  player.x = 100;
  player.y = canvas.height / 2;

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

function drawPlayer() {
  ctx.save();
  ctx.fillStyle = "cyan";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "cyan";

  ctx.beginPath();
  ctx.moveTo(player.x + 25, player.y);
  ctx.lineTo(player.x, player.y + 60);
  ctx.lineTo(player.x + 50, player.y + 60);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function createObstacle() {
  const size = 30 + Math.random() * 45;

  obstacles.push({
    x: canvas.width + size,
    y: Math.random() * (canvas.height - size),
    width: size,
    height: size,
    speed: 4 + Math.random() * 2
  });
}

function drawObstacle(o) {
  ctx.save();
  ctx.fillStyle = "#8b5cff";
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#8b5cff";

  ctx.beginPath();
  ctx.arc(o.x, o.y, o.width / 2, 0, Math.PI * 2);
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

  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  drawPlayer();

  if (Math.random() < 0.025) {
    createObstacle();
  }

  obstacles.forEach((o, i) => {
    o.x -= o.speed;
    drawObstacle(o);

    if (checkCollision(player, o)) {
      endGame();
      return;
    }

    if (o.x + o.width < 0) {
      obstacles.splice(i, 1);
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

async function endGame() {
  if (!gameRunning) return;

  gameRunning = false;
  canvas.style.display = "none";
  gameOver.style.display = "flex";

  document.getElementById("finalScore").textContent = "Score: " + score;
  document.getElementById("finalTime").textContent = "Time: " + gameTime + "s";

  await sendScore();
}

async function sendScore() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const data = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(`SpaceDodger Score:${score} Time:${gameTime}`)
    );

    const tx = await signer.sendTransaction({
      to: walletAddress,
      value: 0,
      data: data
    });

    document.getElementById("tx").innerHTML =
      `<a href="${GENLAYER.explorer}/tx/${tx.hash}" target="_blank">View TX on GenLayer Explorer</a>`;
  } catch {
    document.getElementById("tx").textContent =
      "Transaction cancelled or failed";
  }
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

/* Touch movement for mobile */
canvas.addEventListener("touchmove", e => {
  e.preventDefault();

  const touch = e.touches[0];
  player.x = touch.clientX - player.width / 2;
  player.y = touch.clientY - player.height / 2;
}, { passive: false });

canvas.addEventListener("mousemove", e => {
  if (!gameRunning) return;

  player.x = e.clientX - player.width / 2;
  player.y = e.clientY - player.height / 2;
});

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("startBtn").onclick = startGame;
document.getElementById("retryBtn").onclick = startGame;

document.getElementById("menuBtn").onclick = () => {
  gameOver.style.display = "none";
  menu.style.display = "block";
};
