import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

const MNEMONIC = process.env.MNEMONIC;
const ALCHEMY_KEY_MAINNET = process.env.ALCHEMY_KEY_MAINNET;
const ALCHEMY_KEY_TESTNET = process.env.ALCHEMY_KEY_TESTNET;
const mumbaiNodeUrl = `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_KEY_TESTNET}`;
const polygonNodeUrl = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_MAINNET}`;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.15",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },

  networks: {
    mumbai: { url: mumbaiNodeUrl, accounts: { mnemonic: MNEMONIC } },
    polygon: { url: polygonNodeUrl, accounts: { mnemonic: MNEMONIC } },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYSCAN_KEY!,
      polygonMumbai: process.env.POLYSCAN_KEY!,
    },
  },
};
export default config;
