/* eslint-disable node/no-missing-import */
import { readdirSync, readFileSync } from "fs";
import {
  ActionType,
  Deposits,
  History,
  RoundMeta,
  Token,
  Tokens,
} from "./types";
import { MINT_FEE, TRANSFER_FEE } from "./utils";

function fetchRound(id: number | string, round: number) {
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

function main() {
  const ids = readdirSync("data");
  // const rounds = readdirSync(`data/${id}`);
  const { deposits, history } = fetchRound(ids[0], 1);

  const paidHistory = history.map((action) => {
    return action.type === ActionType.Mint
      ? { fee: MINT_FEE, address: action.to }
      : { fee: TRANSFER_FEE(action.level!), address: action.from };
  });
  const totalFee: { [address: string]: number } = {};
  for (const address in paidHistory) {
    const { fee } = paidHistory[address];
    if (totalFee[address]) {
      totalFee[address] += Number(fee);
    } else {
      totalFee[address] = Number(fee);
    }
  }

  for (const payee in deposits) {
    const paid = totalFee[payee];
    const deposit = deposits[payee];
    console.log(
      `Player ${payee} paid ${paid} and received ${deposit}\nPlayer earned: ${
        deposit - paid
      }\n`
    );
  }
}

main();
