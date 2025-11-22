require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    onechain: {
      url: process.env.ONECHAIN_RPC_URL || "https://rpc.onechain.pro",
      chainId: parseInt(process.env.ONECHAIN_CHAIN_ID || "1234"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 8000000000,
      timeout: 60000, // Increase timeout for network requests
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    // Add hardhat network as fallback for testing
    hardhat_network: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
