const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy CATCoin
  console.log("\n=== Deploying CATCoin ===");
  const CATCoin = await ethers.getContractFactory("CATCoin");
  const catCoin = await CATCoin.deploy();
  await catCoin.waitForDeployment();
  const catCoinAddress = await catCoin.getAddress();
  console.log("CATCoin deployed to:", catCoinAddress);

  // Deploy CatNFT
  console.log("\n=== Deploying CatNFT ===");
  const CatNFT = await ethers.getContractFactory("CatNFT");
  const catNFT = await CatNFT.deploy();
  await catNFT.waitForDeployment();
  const catNFTAddress = await catNFT.getAddress();
  console.log("CatNFT deployed to:", catNFTAddress);

  // Deploy GameItem
  console.log("\n=== Deploying GameItem ===");
  const GameItem = await ethers.getContractFactory("GameItem");
  const gameItem = await GameItem.deploy();
  await gameItem.waitForDeployment();
  const gameItemAddress = await gameItem.getAddress();
  console.log("GameItem deployed to:", gameItemAddress);

  // Deploy PomodoroGame
  console.log("\n=== Deploying PomodoroGame ===");
  const PomodoroGame = await ethers.getContractFactory("PomodoroGame");
  const game = await PomodoroGame.deploy(catCoinAddress, catNFTAddress, gameItemAddress);
  await game.waitForDeployment();
  const gameAddress = await game.getAddress();
  console.log("PomodoroGame deployed to:", gameAddress);

  // IMPORTANT: Initialize prices BEFORE transferring ownership
  // Initialize item prices and types
  console.log("\n=== Initializing game items ===");
  
  // Food items: 1=fish, 2=tuna, 3=salmon, 4=catnip, 5=premium_food
  const foodPrices = {
    1: ethers.parseEther("5"),   // Fish: 5 CAT
    2: ethers.parseEther("10"),  // Tuna: 10 CAT
    3: ethers.parseEther("15"),  // Salmon: 15 CAT
    4: ethers.parseEther("20"),  // Catnip: 20 CAT
    5: ethers.parseEther("30"),  // Premium Food: 30 CAT
  };

  // Toy items: 6=football, 7=yarn, 8=laser, 9=mouse, 10=scratch
  const toyPrices = {
    6: ethers.parseEther("8"),   // Football: 8 CAT
    7: ethers.parseEther("12"),  // Yarn Ball: 12 CAT
    8: ethers.parseEther("15"),  // Laser Pointer: 15 CAT
    9: ethers.parseEther("20"),  // Mouse: 20 CAT
    10: ethers.parseEther("35"), // Scratch Post: 35 CAT
  };

  console.log("Setting food item prices...");
  for (const [itemId, price] of Object.entries(foodPrices)) {
    await gameItem.setItemPrice(itemId, price);
    await gameItem.setItemType(itemId, 0); // 0 = food
    console.log(`  ✓ Set food item ${itemId} price to ${ethers.formatEther(price)} CAT`);
  }

  console.log("Setting toy item prices...");
  for (const [itemId, price] of Object.entries(toyPrices)) {
    await gameItem.setItemPrice(itemId, price);
    await gameItem.setItemType(itemId, 1); // 1 = toy
    console.log(`  ✓ Set toy item ${itemId} price to ${ethers.formatEther(price)} CAT`);
  }

  // Initialize cat prices
  console.log("\n=== Initializing cat prices ===");
  // Cat types: 0=default, 1=black, 2=white, 3=ginger
  const catPrices = {
    0: ethers.parseEther("0"),   // Default: Free
    1: ethers.parseEther("50"),  // Black Cat: 50 CAT
    2: ethers.parseEther("75"),  // White Cat: 75 CAT
    3: ethers.parseEther("150"), // Ginger Cat: 150 CAT
  };

  for (const [catTypeId, price] of Object.entries(catPrices)) {
    await catNFT.setCatPrice(catTypeId, price);
    console.log(`  ✓ Set cat type ${catTypeId} price to ${ethers.formatEther(price)} CAT`);
  }

  // Setup: Transfer ownership of tokens to game contract (AFTER setting prices)
  console.log("\n=== Transferring ownership to game contract ===");
  
  // Transfer CATCoin ownership to game contract
  console.log("Transferring CATCoin ownership...");
  await catCoin.transferOwnership(gameAddress);
  console.log("  ✓ CATCoin ownership transferred");

  // Transfer CatNFT ownership to game contract
  console.log("Transferring CatNFT ownership...");
  await catNFT.transferOwnership(gameAddress);
  console.log("  ✓ CatNFT ownership transferred");

  // Transfer GameItem ownership to game contract
  console.log("Transferring GameItem ownership...");
  await gameItem.transferOwnership(gameAddress);
  console.log("  ✓ GameItem ownership transferred");

  // Deploy Marketplace
  console.log("\n=== Deploying Marketplace ===");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(catNFTAddress, gameItemAddress, catCoinAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  // Setup Marketplace: Game contract needs to approve Marketplace for minting
  // (Marketplace will handle transfers, but game contract needs to allow it)
  console.log("\n=== Setting up Marketplace ===");
  console.log("Note: Users will need to approve Marketplace for their NFTs/items");
  console.log("  ✓ Marketplace ready for trading");

  console.log("\n=== ✅ Deployment Complete! ===");
  console.log("\n=== Contract Addresses ===");
  console.log("CATCoin:", catCoinAddress);
  console.log("CatNFT:", catNFTAddress);
  console.log("GameItem:", gameItemAddress);
  console.log("PomodoroGame:", gameAddress);
  console.log("Marketplace:", marketplaceAddress);
  
  console.log("\n=== Copy these addresses to your frontend .env file ===");
  console.log(`VITE_CAT_COIN_ADDRESS=${catCoinAddress}`);
  console.log(`VITE_CAT_NFT_ADDRESS=${catNFTAddress}`);
  console.log(`VITE_GAME_ITEM_ADDRESS=${gameItemAddress}`);
  console.log(`VITE_GAME_CONTRACT_ADDRESS=${gameAddress}`);
  console.log(`VITE_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
