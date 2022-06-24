/* eslint-disable node/no-missing-import */
import { parseEther } from "ethers/lib/utils";
import { readFileSync } from "fs";
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

export const META_CSV = "meta.csv";
export const ROUND_CSV = "rounds.csv";

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
