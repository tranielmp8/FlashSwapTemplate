require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {version: "0.5.5"}, 
      {version: "0.6.6"},
      {version: "0.8.8"},
      {version: "0.8.28"},
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_MAIN_URL,
        // url: "https://bsc-dataseed.binance.org/",
      },
      gasPrice: 0,
      initialBaseFeePerGas: 0,
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [`0x${process.env.PRIVATE_KEY_SEPOLIA}`], //private key ALSO PUT 0x in front of your key
    },
    mainnet: {
      url: process.env.ALCHEMY_MAIN_URL,
      // url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
    }
  }

};

// may need this one: https://bsc-dataseed.binance.org/