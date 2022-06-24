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

function calcProfit(id: number | string, round: number | string) {
  console.log(`Calculating for ${id}, Round ${round}`);
  const { deposits, history } = fetchRound(id, round);
  const paidHistory = history.map((action) => {
    return action.type === ActionType.Mint
      ? { fee: Number(MINT_FEE), address: action.to }
      : { fee: Number(TOSS_FEE(action.level!)), address: action.from! };
  });
  const totalFee: { [address: string]: number } = {};
  for (const { address, fee } of paidHistory) {
    if (totalFee[address]) {
      totalFee[address] += fee;
    } else {
      totalFee[address] = fee;
    }
  }

  for (const payee in deposits) {
    const paid = totalFee[payee] || 0;
    const deposit = deposits[payee];
    console.log(
      `Player ${payee} paid ${paid} and received ${deposit}\nPlayer earned: ${
        (deposit - paid) / Math.pow(10, 18)
      } MATIC`
    );
  }
}

function main() {
  const ids = readdirSync("data");
  for (const id of ids) {
    const rounds = readdirSync(`data/${ids}`);
    for (const round of rounds) {
      calcProfit(id, round);
      console.log();
    }
  }
}

main();
