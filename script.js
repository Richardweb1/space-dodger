let provider;
let signer;
let userAddress;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let player, obstacles, gameRunning, score;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

async function connectWallet() {
  if (!window.ethereum) return alert("Install MetaMask");

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  await switchToGenLayer();

  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  document.getElementById("wallet").innerText =
    "Connected: " + userAddress.slice(0,6) + "...";
}

async function switchToGenLayer() {
  const chainId = "0x107D";

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }]
    });
  } catch (err) {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainId,
        chainName: "GenLayer Testnet",
        nativeCurrency: {
          name: "GEN",
          symbol: "GEN",
          decimals: 18
        },
        rpcUrls: ["https://rpc.testnet-chain.genlayer.com"],
        blockExplorerUrls: ["https://explorer.testnet-chain.genlayer.com"]
      }]
    });
  }
}

function startGame() {
  document.getElementById("menu").style.display = "none";
  canvas.style.display = "block";

  player = { x: 200, y: 400, size: 20 };
  obstacles = [];
  score = 0;
  gameRunning = true;

  requestAnimationFrame(loop);
}

function loop() {
  if (!gameRunning) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  player.x += (keys["ArrowRight"] ? 5 : 0);
  player.x -= (keys["ArrowLeft"] ? 5 : 0);

  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  if (Math.random() < 0.03) {
    obstacles.push({ x: Math.random()*canvas.width, y: 0 });
  }

  obstacles.forEach(o => {
    o.y += 4;
    ctx.fillStyle = "red";
    ctx.fillRect(o.x, o.y, 20, 20);

    if (Math.abs(o.x - player.x) < 20 && Math.abs(o.y - player.y) < 20) {
      endGame();
    }
  });

  score++;
  requestAnimationFrame(loop);
}

function endGame() {
  gameRunning = false;
  canvas.style.display = "none";

  document.getElementById("gameOver").style.display = "block";
  document.getElementById("finalScore").innerText = "Score: " + score;
}

async function submitScore() {
  if (!signer) return alert("Connect wallet first");

  const tx = await signer.sendTransaction({
    to: userAddress,
    value: 0,
    data: ethers.hexlify(ethers.toUtf8Bytes("Score:" + score))
  });

  document.getElementById("tx").innerHTML =
    "TX:<br>" +
    tx.hash +
    "<br><br><a href='https://explorer.testnet-chain.genlayer.com/tx/" +
    tx.hash +
    "' target='_blank'>View Transaction</a>";
}

let keys = {};

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);
