/* eslint-disable node/no-missing-import */
import { readdirSync, readFileSync } from "fs";
import { ActionType, Deposits, History, RoundMeta, Tokens } from "./types";
import { MINT_FEE, TOSS_FEE } from "./utils";

function fetchRound(id: number | string, round: number | string) {
  const tokenData: Tokens = JSON.parse(
    String(readFileSync(`data/${id}/${round}/tokens.json`))
  );
  const roundData: RoundMeta = JSON.parse(
    String(readFileSync(`data/${id}/${round}/round.json`))
  );
  const deposits: Deposits = JSON.parse(
    String(readFileSync(`data/${id}/${round}/deposit.json`))
  );
  const history: History = JSON.parse(
    String(readFileSync(`data/${id}/${round}/history.json`))
  );
  return { roundData, tokenData, deposits, history };
}

function calculate(numbers: number[]) {
  const avg = numbers.reduce((prev, curr) => prev + curr, 0) / numbers.length;
  const max = numbers.reduce(
    (prev, curr) => (prev > curr ? prev : curr),
    Number.MIN_SAFE_INTEGER
  );
  const min = numbers.reduce(
    (prev, curr) => (prev > curr ? curr : prev),
    Number.MAX_SAFE_INTEGER
  );
  return { avg, max, min };
}

function accumulateFee(s: { fee: number; address: string }[]) {
  const result: { [address: string]: number } = {};
  for (const { address, fee } of s) {
    if (result[address]) {
      result[address] += fee;
    } else {
      result[address] = fee;
    }
  }
  return result;
}

function analyzeRound(id: number | string, round: number | string) {
  const { deposits, history } = fetchRound(id, round);
  const paidHistory = history.map((action) => {
    return action.type === ActionType.Mint
      ? { fee: Number(MINT_FEE), address: action.to }
      : { fee: Number(TOSS_FEE(action.level!)), address: action.from! };
  });
  const totalFee = accumulateFee(paidHistory);
  const profitsData = [];
  for (const payee in deposits) {
    const paid = totalFee[payee] || 0;
    const deposit = deposits[payee];
    profitsData.push(deposit - paid);
  }
  const spendings = calculate(Object.values(totalFee));
  const profits = calculate(profitsData);
  return { spendings, profits };
}

function main() {
  const ids = readdirSync("data");
  for (const id of ids) {
    const rounds = readdirSync(`data/${ids}`);
    const totalSupply = [];
    const tosses = [];
    for (const round of rounds) {
      const { roundData } = fetchRound(id, round);
      totalSupply.push(roundData.totalSupply);
      tosses.push(roundData.tosses);
      analyzeRound(id, round);
      console.log();
    }
    const supplyData = calculate(totalSupply);
    const tossData = calculate(tosses);
  }
}

main();
