async function submitScoreTx() {
  try {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    if (!walletAddress) {
      alert("Connect wallet first");
      return;
    }

    txStatus.textContent = "Waiting for signature...";

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // 🔥 IMPORTANT: real message stored on-chain
    const message = `Score:${score},Level:${level},Result:${finalResult}`;

    const tx = await signer.sendTransaction({
      to: walletAddress, // send to yourself
      value: ethers.utils.parseEther("0"), // 0 GEN
      data: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(message)
      )
    });

    txStatus.innerHTML =
      `✅ Transaction sent<br>
       <a href="https://explorer-bradbury.genlayer.com/tx/${tx.hash}" target="_blank">
       View TX</a>`;

  } catch (err) {
    console.log(err);
    txStatus.textContent = "❌ Transaction failed or rejected";
  }
}
