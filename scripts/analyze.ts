/* eslint-disable node/no-missing-import */
import { BigNumber } from "ethers";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { ethers } from "hardhat";
import { ActionType } from "./types";
import {
  CSV_FOLDER,
  fetchRound,
  makePath,
  META_CSV,
  MINT_FEE,
  ROUNDS_FOLDER,
  ROUND_CSV,
  TOSS_FEE,
} from "./utils";

function median(numbers: BigNumber[]) {
  const sorted = numbers.sort((a, b) => (a.eq(b) ? 0 : a.lt(b) ? -1 : 1));
  const m = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 0) {
    return sorted[m];
  } else {
    return sorted[m].add(sorted[m + 1]).div(2);
  }
}

function calculate(numbers: BigNumber[]) {
  const avg = numbers
    .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))
    .div(numbers.length);

  const max = numbers.reduce(
    (prev, curr) => (prev.gt(curr) ? prev : curr),
    numbers[0]
  );
  const min = numbers.reduce(
    (prev, curr) => (prev.gt(curr) ? curr : prev),
    numbers[0]
  );
  return { avg, min, max };
}

function format(data: { avg: BigNumber; min: BigNumber; max: BigNumber }) {
  const { avg, min, max } = data;
  return {
    avg: avg.toString(),
    min: min.toString(),
    max: max.toString(),
  };
}

function formatEther(data: { avg: BigNumber; min: BigNumber; max: BigNumber }) {
  const { avg, min, max } = data;
  return {
    avg: ethers.utils.formatEther(avg),
    min: ethers.utils.formatEther(min),
    max: ethers.utils.formatEther(max),
  };
}

function formatData(
  data: { avg: number | string; min: number | string; max: number | string },
  descr: string | undefined
) {
  const { avg, min, max } = data;
  let csv = "";
  if (descr) csv = `Avg ${descr}, Min ${descr}, Max ${descr},\r`;
  csv += `${avg},${min},${max}`;
  return csv;
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
    const profit = BigNumber.from(deposits[payee].toString()).sub(
      paid.toString()
    );
    profitsData.push(profit);
  }
  const spendings = calculate(
    Object.values(totalFee).map((fee) => BigNumber.from(fee.toString()))
  );
  const profits = calculate(profitsData);
  const med = median(profitsData);

  return { spendings, profits, median: med };
}

function main() {
  const ids = ["1656499153284"]; // readdirSync(DATA_FOLDER);
  for (const id of ids) {
    const rounds = readdirSync(makePath(id, ROUNDS_FOLDER))
      .map((s) => Number(s))
      .sort((a, b) => a - b);
    const totalSupply = [];
    const tosses = [];
    const payouts = [];
    let csv =
      "Round,Avg Profit, Min Profit, Max Profit, Median Profit, Avg Spending, Min Spending, Max Spending,\r";
    for (const round of rounds) {
      const { roundData } = fetchRound(id, round);
      totalSupply.push(BigNumber.from(roundData.totalSupply.toString()));
      tosses.push(BigNumber.from(roundData.tosses.toString()));
      payouts.push(BigNumber.from(roundData.payout.toString()));
      const { spendings, profits, median } = analyzeRound(id, round);
      const minProfit = profits.min;
      const maxProfit = profits.max;
      const avgProfit = profits.avg;
      const entry = `${round},${avgProfit},${ethers.utils.formatEther(
        minProfit
      )},${ethers.utils.formatEther(maxProfit)},${ethers.utils.formatEther(
        median
      )},${formatData(formatEther(spendings), undefined)}\r`;
      csv += entry;
    }
    if (!existsSync(makePath(id, CSV_FOLDER)))
      mkdirSync(makePath(id, CSV_FOLDER));
    writeFileSync(makePath(id, CSV_FOLDER, ROUND_CSV), csv);
    csv = formatData(format(calculate(totalSupply)), "Supply");
    csv += "\n";
    csv += formatData(format(calculate(tosses)), "Toss");
    csv += "\n";
    csv += formatData(formatEther(calculate(payouts)), "Payout");
    writeFileSync(makePath(id, CSV_FOLDER, META_CSV), csv);
  }
}

main();
