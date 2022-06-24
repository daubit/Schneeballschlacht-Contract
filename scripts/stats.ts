/* eslint-disable node/no-missing-import */
import { readdirSync, readFileSync } from "fs";
import { Deposits, History, RoundMeta, Token, Tokens } from "./types";

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
  const { roundData, tokenData, deposits, history } = fetchRound(ids[0], 1);

  console.log();
  const paid = "";

  for (const address in tokenData) {
    const tokens = tokenData[address] || [];
    if (tokens instanceof Array) {
      const totalLevel = tokens.reduce(
        (a: number, b: Token) => a + Number(b.level),
        0
      );
      console.log({ address, totalLevel });
    }
  }
}

main();
