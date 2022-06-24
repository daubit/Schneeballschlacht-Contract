/* eslint-disable node/no-missing-import */
import { readdirSync } from "fs";
import { ActionType } from "./types";
import { fetchRound, MINT_FEE, TOSS_FEE } from "./utils";

function calcProfit(id: number | string, round: number | string) {
  console.log(`\nCalculating for ${id}, Round ${round}`);
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
    const rounds = readdirSync(`data/${ids}/rounds`)
      .map((s) => Number(s))
      .sort((a, b) => a - b);
    for (const round of rounds) {
      calcProfit(id, round);
    }
  }
}

main();
