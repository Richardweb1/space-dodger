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

const GENLAYER_TESTNET = {
  chainId: "0x107d",
  chainName: "GenLayer Testnet Bradbury",
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"]
};

const player = { x: 0, y: 0, width: 50, height: 60, speed: 6 };
let obstacles = [];
const keys = {};

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
        params: [{ chainId: GENLAYER_TESTNET.chainId }]
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_TESTNET]
        });
      } else {
        throw err;
      }
    }

    isConnected = true;
    alert("Wallet connected to GenLayer testnet.");
  } catch (err) {
    console.error(err);
    alert("Wallet connection failed.");
  }
}

function startGame() {
  if (!isConnected) {
    alert("Connect wallet first.");
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
  ctx.fillStyle = "cyan";
  ctx.shadowBlur = 20;
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
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#8b5cff";
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.width / 2, 0, Math.PI * 2);
  ctx.fill();
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

  if (Math.random() < 0.02) createObstacle();

  obstacles.forEach((o, i) => {
    o.x -= o.speed;
    drawObstacle(o);

    if (checkCollision(player, o)) endGame();

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
  gameRunning = false;
  canvas.style.display = "none";
  gameOver.style.display = "flex";

  document.getElementById("finalScore").textContent = "Score: " + score;
  document.getElementById("finalTime").textContent = "Time: " + gameTime + "s";

  await submitScoreTransaction();
}

async function submitScoreTransaction() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const message = `Space Dodger | Score: ${score} | Time: ${gameTime}s`;

    const tx = await signer.sendTransaction({
      to: walletAddress,
      value: 0,
      data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))
    });

    document.getElementById("tx").innerHTML =
      `Sign complete!<br>
      TX: ${tx.hash}<br>
      <a href="${GENLAYER_TESTNET.blockExplorerUrls[0]}/tx/${tx.hash}" target="_blank">
        View on GenLayer Explorer
      </a>`;
  } catch (err) {
    console.error(err);
    document.getElementById("tx").textContent =
      "Transaction cancelled or failed. Make sure you have GEN testnet tokens.";
  }
}

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("retryBtn").addEventListener("click", startGame);

document.getElementById("menuBtn").addEventListener("click", () => {
  gameOver.style.display = "none";
  menu.style.display = "block";
});
