// scripts/deployFactory.js
const hre = require("hardhat");

async function main() {
  const [sender] = await hre.ethers.getSigners();
  console.log("Deploying from:", sender.address);

  const Factory = await hre.ethers.getContractFactory("DataCoinFactory");
  const factory = await Factory.deploy();

  // ethers v6 / hardhat: wait for deployment this way
  await factory.waitForDeployment();

  // getAddress() returns the deployed contract address (works with ethers v6)
  const address = await factory.getAddress();
  console.log("✅ DataCoinFactory deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
