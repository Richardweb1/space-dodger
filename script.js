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
  blockExplorer: "https://explorer-bradbury.genlayer.com"
};

const player = { x: 0, y: 0, width: 50, height: 60, speed: 6 };
let obstacles = [];
const keys = {};

async function connectWallet() {
  if (!window.ethereum) {
    alert("Install MetaMask");
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
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }
        }]
      });
    }

    isConnected = true;
    alert("Wallet connected ✅");

  } catch {
    alert("Connection failed");
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
  canvas.style.display = "block";
  gameRunning = true;

  gameLoop();
}

function drawPlayer() {
  ctx.fillStyle = "cyan";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "cyan";

  ctx.beginPath();
  ctx.moveTo(player.x + 25, player.y);
  ctx.lineTo(player.x, player.y + 60);
  ctx.lineTo(player.x + 50, player.y + 60);
  ctx.closePath();
  ctx.fill();
}

function createObstacle() {
  const size = 30 + Math.random() * 40;
  obstacles.push({
    x: canvas.width,
    y: Math.random() * (canvas.height - size),
    width: size,
    height: size,
    speed: 4
  });
}

function drawObstacle(o) {
  ctx.fillStyle = "#8b5cff";
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.width / 2, 0, Math.PI * 2);
  ctx.fill();
}

function checkCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function gameLoop() {
  if (!gameRunning) return;

  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;

  drawPlayer();

  if (Math.random() < 0.02) createObstacle();

  obstacles.forEach((o, i) => {
    o.x -= o.speed;
    drawObstacle(o);

    if (checkCollision(player, o)) endGame();

    if (o.x < 0) {
      obstacles.splice(i, 1);
      score += 10;
    }
  });

  gameTime = Math.floor((Date.now() - startTime) / 1000);

  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 20, 40);

  requestAnimationFrame(gameLoop);
}

async function endGame() {
  gameRunning = false;
  canvas.style.display = "none";
  gameOver.style.display = "flex";

  document.getElementById("finalScore").textContent = "Score: " + score;
  document.getElementById("finalTime").textContent = "Time: " + gameTime;

  await sendScore();
}

async function sendScore() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const msg = `Score:${score},Time:${gameTime}`;

    const tx = await signer.sendTransaction({
      to: walletAddress,
      value: 0,
      data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(msg))
    });

    document.getElementById("tx").innerHTML =
      `<a href="${GENLAYER.blockExplorer}/tx/${tx.hash}" target="_blank">View TX</a>`;
  } catch {
    document.getElementById("tx").textContent = "Transaction cancelled";
  }
}

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("startBtn").onclick = startGame;
document.getElementById("retryBtn").onclick = startGame;

document.getElementById("menuBtn").onclick = () => {
  gameOver.style.display = "none";
  menu.style.display = "block";
};
