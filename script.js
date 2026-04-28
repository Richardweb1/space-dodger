// Game variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const gameOver = document.getElementById("gameOver");

let gameRunning = false;
let score = 0;
let gameTime = 0;
let startTime;
let isConnected = false;

const player = {
  x: 0,
  y: 0,
  width: 50,
  height: 60,
  speed: 6
};

let obstacles = [];
const keys = {};

function connectWallet() {
  isConnected = true;
  alert("Demo mode: GenLayer testnet connection ready.");
}

function startGame() {
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

  ctx.restore();
}

function createObstacle() {
  const size = 30 + Math.random() * 40;

  obstacles.push({
    x: canvas.width,
    y: Math.random() * (canvas.height - size),
    width: size,
    height: size,
    speed: 3 + Math.random() * 2
  });
}

function drawObstacle(obs) {
  ctx.save();
  ctx.fillStyle = "#8b5cff";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#8b5cff";
  ctx.beginPath();
  ctx.arc(obs.x, obs.y, obs.width / 2, 0, Math.PI * 2);
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

  if (Math.random() < 0.02) createObstacle();

  obstacles.forEach((obs, index) => {
    obs.x -= obs.speed;
    drawObstacle(obs);

    if (checkCollision(player, obs)) endGame();

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

function endGame() {
  gameRunning = false;
  canvas.style.display = "none";
  gameOver.style.display = "flex";

  document.getElementById("finalScore").textContent = "Score: " + score;
  document.getElementById("finalTime").textContent = "Time: " + gameTime + "s";
  document.getElementById("tx").textContent =
    "GenLayer demo: score ready for future AI validation.";
}

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("retryBtn").addEventListener("click", startGame);

document.getElementById("menuBtn").addEventListener("click", () => {
  gameOver.style.display = "none";
  menu.style.display = "block";
});
