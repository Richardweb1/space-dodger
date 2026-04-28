// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const gameOver = document.getElementById('gameOver');

let gameRunning = false;
let score = 0;
let gameTime = 0;
let startTime;
let walletAddress = null;
let isConnected = false;

// GenLayer testnet configuration
const GENLAYER_TESTNET = {
  chainId: '0x...',  // Add GenLayer testnet chain ID
  chainName: 'GenLayer Testnet',
  rpcUrls: ['https://rpc.testnet.genlayer.com'], // Update with actual RPC
  nativeCurrency: {
    name: 'GenLayer',
    symbol: 'GEN',
    decimals: 18
  },
  blockExplorerUrls: ['https://explorer.testnet.genlayer.com']
};

// Player (spaceship)
const player = {
  x: 0,
  y: 0,
  width: 50,
  height: 60,
  speed: 6
};

// Create spaceship with new triangular design
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  
  // Main ship body - sleek triangle design
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -25); // Top point
  ctx.lineTo(-18, 25); // Bottom left
  ctx.lineTo(-8, 15); // Inner left
  ctx.lineTo(0, -10); // Inner top
  ctx.lineTo(8, 15); // Inner right
  ctx.lineTo(18, 25); // Bottom right
  ctx.closePath();
  ctx.fill();
  
  // Center detail
  ctx.fillStyle = '#050816';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-6, 12);
  ctx.lineTo(6, 12);
  ctx.closePath();
  ctx.fill();
  
  // Glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00d9ff';
  ctx.strokeStyle = '#00d9ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.restore();
}

// Obstacles
let obstacles = [];

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
  
  // Asteroid-like shape
  ctx.fillStyle = '#8b5cff';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#8b5cff';
  
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = obs.width / 2 * (0.8 + Math.random() * 0.4);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

// Collision detection
function checkCollision(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Touch controls for mobile
let touchY = null;
canvas.addEventListener('touchstart', (e) => {
  touchY = e.touches[0].clientY;
});
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (touchY !== null) {
    const deltaY = e.touches[0].clientY - touchY;
    player.y += deltaY;
    touchY = e.touches[0].clientY;
  }
});
canvas.addEventListener('touchend', () => touchY = null);

// Game loop
function gameLoop() {
  if (!gameRunning) return;
  
  // Clear canvas
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw stars background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 50; i++) {
    const x = (i * 123) % canvas.width;
    const y = (i * 456) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }
  
  // Update player position
  if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
  if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
  
  // Keep player in bounds
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  
  // Draw player
  drawPlayer();
  
  // Create obstacles
  if (Math.random() < 0.02) createObstacle();
  
  // Update and draw obstacles
  obstacles.forEach((obs, index) => {
    obs.x -= obs.speed;
    obs.rotation += 0.02;
    drawObstacle(obs);
    
    // Check collision
    if (checkCollision(player, obs)) {
      endGame();
    }
    
    // Remove off-screen obstacles
    if (obs.x + obs.width < 0) {
      obstacles.splice(index, 1);
      score += 10;
    }
  });
  
  // Update time
  gameTime = Math.floor((Date.now() - startTime) / 1000);
  
  // Draw score
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`Time: ${gameTime}s`, 20, 70);
  
  requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
  if (!isConnected) {
    alert('Please connect your wallet first!');
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
  
  menu.style.display = 'none';
  gameOver.style.display = 'none';
  canvas.style.display = 'block';
  gameRunning = true;
  
  gameLoop();
}

// End game and submit score to blockchain
async function endGame() {
  gameRunning = false;
  canvas.style.display = 'none';
  gameOver.style.display = 'flex';
  
  document.getElementById('finalScore').textContent = `Score: ${score}`;
  document.getElementById('finalTime').textContent = `Time: ${gameTime}s`;
  
  // Submit score to GenLayer blockchain
  if (isConnected && score > 0) {
    await submitScoreToBlockchain(score, gameTime);
  }
}

// Connect to GenLayer Testnet Wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    alert('Please install MetaMask or another Web3 wallet!');
    return;
  }
  
  try {
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    walletAddress = accounts[0];
    
    // Check if we're on GenLayer testnet
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });
    
    // If not on GenLayer, try to switch
    if (chainId !== GENLAYER_TESTNET.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: GENLAYER_TESTNET.chainId }],
        });
      } catch (switchError) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [GENLAYER_TESTNET],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    isConnected = true;
    
    // Update UI
    const walletStatus = document.getElementById('walletStatus');
    walletStatus.innerHTML = `✓ ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    walletStatus.style.color = '#6eff6e';
    
    // Change button text
    document.getElementById('connectBtn').innerHTML = '<span>✓</span> CONNECTED';
    
  } catch (error) {
    console.error('Wallet connection error:', error);
    alert('Failed to connect wallet: ' + error.message);
  }
}

// Submit score to GenLayer blockchain
async function submitScoreToBlockchain(finalScore, finalTime) {
  if (!isConnected || !window.ethereum) return;
  
  try {
    // Contract ABI and address (update with your deployed contract)
    const contractAddress = '0x...'; // Your GenLayer contract address
    const contractABI = [
      {
        "inputs": [
          {"internalType": "uint256", "name": "score", "type": "uint256"},
          {"internalType": "uint256", "name": "time", "type": "uint256"}
        ],
        "name": "submitScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    
    // Create contract instance using ethers.js or web3.js
    // For simplicity, using direct eth_sendTransaction
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Submit transaction
    const tx = await contract.submitScore(finalScore, finalTime);
    
    // Show transaction hash
    document.getElementById('tx').innerHTML = `
      Transaction submitted!<br>
      <a href="${GENLAYER_TESTNET.blockExplorerUrls[0]}/tx/${tx.hash}" 
         target="_blank" 
         style="color: #00d9ff; text-decoration: underline;">
        View on Explorer: ${tx.hash.slice(0, 10)}...
      </a>
    `;
    
    // Wait for confirmation
    await tx.wait();
    document.getElementById('tx').innerHTML += '<br>✓ Score recorded on blockchain!';
    
  } catch (error) {
    console.error('Blockchain submission error:', error);
    document.getElementById('tx').textContent = 'Failed to submit score to blockchain';
  }
}

// Handle account changes
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      isConnected = false;
      walletAddress = null;
      document.getElementById('walletStatus').innerHTML = 'Not connected';
      document.getElementById('walletStatus').style.color = '#ff6b6b';
      document.getElementById('connectBtn').innerHTML = '<span>💼</span> CONNECT WALLET';
    } else {
      walletAddress = accounts[0];
      document.getElementById('walletStatus').innerHTML = `✓ ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }
  });
  
  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

// Button handlers
document.getElementById('connectBtn').addEventListener('click', connectWallet);
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('menuBtn').addEventListener('click', () => {
  gameOver.style.display = 'none';
  menu.style.display = 'block';
});

// Resize handler
window.addEventListener('resize', () => {
  if (gameRunning) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
