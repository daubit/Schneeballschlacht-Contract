/* eslint-disable node/no-missing-import */
import { BigNumber, Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { readFileSync } from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deposits, RoundMeta, Tokens, History } from "./types";

export const TOSS_FEE = (level: number) =>
  parseEther((0.01 * level).toFixed(10));

export const MINT_FEE = parseEther("0.05");

export const CSV_FOLDER = "csv";
export const DATA_FOLDER = "data";
export const ROUNDS_FOLDER = "rounds";

export const TOKEN_FILE = "tokens.json";
export const ROUND_FILE = "round.json";
export const HISTORY_FILE = "history.json";
export const DEPOSIT_FILE = "deposit.json";

export const GAS_CSV = "gas.csv";
export const META_CSV = "meta.csv";
export const ROUND_CSV = "rounds.csv";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function makePath(id: any, category?: any, round?: any, file?: any) {
  if (!(round || file)) {
    return `${DATA_FOLDER}/${id}/${category}`;
  } else if (!file) {
    return `${DATA_FOLDER}/${id}/${category}/${round}`;
  } else {
    return `${DATA_FOLDER}/${id}/${category}/${round}/${file}`;
  }
}

export function fetchRound(id: number | string, round: number | string) {
  const tokenData: Tokens = JSON.parse(
    String(readFileSync(makePath(id, ROUNDS_FOLDER, round, TOKEN_FILE)))
  );
  const roundData: RoundMeta = JSON.parse(
    String(readFileSync(makePath(id, ROUNDS_FOLDER, round, ROUND_FILE)))
  );
  const deposits: Deposits = JSON.parse(
    String(readFileSync(makePath(id, ROUNDS_FOLDER, round, DEPOSIT_FILE)))
  );
  const history: History = JSON.parse(
    String(readFileSync(makePath(id, ROUNDS_FOLDER, round, HISTORY_FILE)))
  );
  return { roundData, tokenData, deposits, history };
}

export async function hasTokens(contract: Contract, address: string) {
  const balance = await contract["balanceOf(address)"](address);
  return Number(balance) > 0;
}

export async function getLevel(
  contract: Contract,
  tokenId: number | BigNumber
) {
  return Number(await contract.functions["getLevel(uint256)"](tokenId));
}

export async function getToken(contract: Contract, address: string) {
  const tokens = await contract["getTokensOfAddress(address)"](address);
  let maxToken = -1;
  let tmpLevel = 0;
  let tmpAmount = -1;
  for (const token of tokens) {
    const level = await getLevel(contract, token);
    const partners = await contract["getPartnerTokenIds(uint256)"](token);
    if (tmpLevel < level && partners.length < level + 1) {
      tmpLevel = level;
      maxToken = token;
    } else if (tmpLevel === level) {
      if (tmpAmount < 0 && partners.length < level + 1) {
        tmpLevel = level;
        maxToken = token;
        tmpAmount = partners.length;
      } else if (tmpAmount < partners.length && partners.length < level + 1) {
        maxToken = token;
        tmpAmount = partners.length;
      }
    }
  }
  return { token: maxToken, level: tmpLevel };
}

const NETWORK_NAME: { [chainId: number]: string } = {
  80001: "mumbai",
  137: "polygon",
  1337: "development",
};

export const networkName = (chainId: number) =>
  NETWORK_NAME[chainId]
    ? NETWORK_NAME[chainId]
    : new Error("Cannot find chain name");

export const verify = async (
  hardhat: HardhatRuntimeEnvironment,
  adddress: string,
  chainId: number,
  params?: unknown[]
) => {
  console.log(chainId);
  if ([80001, 137, 1337].includes(chainId)) {
    hardhat.run("verify", {
      address: adddress,
      network: networkName(chainId),
      constructorArgsParams: params ?? [],
    });
  } else {
    console.log(`Cannot verify for ChainId ${chainId}`);
  }
};
