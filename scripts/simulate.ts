/* eslint-disable node/no-missing-import */
/* eslint-disable object-shorthand */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { randomInt } from "crypto";
import { Contract } from "ethers";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { ethers } from "hardhat";
import { Simulation } from "./simulation";
import { Action, ActionType } from "./types";
import { getLevel, getToken, hasTokens, MINT_FEE, TOSS_FEE } from "./utils";

let history: Action[] = [];

const sim = new Simulation();

async function initRound(id: number, round: number, schneeball: Contract) {
  if (!existsSync(`data/${id}/rounds/${round}`)) {
    mkdirSync(`data/${id}/rounds/${round}`, { recursive: true });
    console.log(`Folder data/${id}/rounds/${round} created`);
  }
  const startTx = await schneeball.startRound();
  await startTx.wait();
  history = [];
  sim.partners = {};
}

async function simulateRound(id: number, schneeball: Contract) {
  const signer = await sim.getRandomSigner();
  const currentAddress = signer.address;
  const { token: tokenId, level } = await getToken(schneeball, currentAddress);
  const canThrow = await hasTokens(schneeball, currentAddress);
  if (canThrow && tokenId > 0) {
    const randAddress = sim.newPartner(currentAddress, tokenId);
    const transferTx = await schneeball
      .connect(signer)
      .toss(randAddress, tokenId, {
        value: TOSS_FEE(level),
      });
    await transferTx.wait();
    console.log(
      `Game ${id}:\t${currentAddress} tossed to ${randAddress} with tokenId ${tokenId} at ${level}`
    );
    history.push({
      timestamp: Date.now(),
      type: ActionType.Toss,
      from: currentAddress,
      to: randAddress,
      tokenId: Number(tokenId),
      level: level,
    });
  } else {
    console.log(`Game ${id}:\t${currentAddress} minted...`);
    const mintTx = await schneeball.connect(signer).mint(currentAddress, {
      value: MINT_FEE,
    });
    await mintTx.wait();
    history.push({
      type: ActionType.Mint,
      timestamp: Date.now(),
      to: currentAddress,
      from: undefined,
      tokenId: undefined,
      level: 1,
    });
  }
}

async function saveRound(id: number, schneeball: Contract, round: number) {
  const roundData: any = {};
  const winner = await schneeball["getWinner()"]();
  const payout = await schneeball["getPayout()"]();
  const tosses = await schneeball["totalTosses()"]();
  const totalSupply = await schneeball["totalSupply()"]();
  const payoutPerLevel = await schneeball["getPayoutPerLevel(uint256)"](round);
  roundData.winner = winner;
  roundData.payout = Number(payout);
  roundData.tosses = Number(tosses);
  roundData.totalSupply = Number(totalSupply);
  roundData.payoutPerLevel = Number(payoutPerLevel);
  writeFileSync(
    `data/${id}/rounds/${round}/round.json`,
    JSON.stringify(roundData, null, 2)
  );
}

async function saveTokens(id: number, schneeball: Contract, round: number) {
  const total = await schneeball["totalSupply()"]();
  const addressData: { [address: string]: any[] } = {};
  console.log(`Game ${id}:\tTotal supply: ${total}`);
  for (let i = 1; i <= Number(total); i++) {
    const owner = await schneeball["ownerOf(uint256)"](i);
    const level = await getLevel(schneeball, i);
    const entry = { tokenId: i, level: level };
    if (addressData[owner]) {
      addressData[owner].push(entry);
    } else {
      addressData[owner] = [entry];
    }
  }
  writeFileSync(
    `data/${id}/rounds/${round}/tokens.json`,
    JSON.stringify(addressData, null, 2)
  );
}

async function save(id: number, contract: Contract, round: number) {
  await saveRound(id, contract, round);
  await saveTokens(id, contract, round);
  writeFileSync(
    `data/${id}/${round}/history.json`,
    JSON.stringify(history, null, 2)
  );
}

async function payout(id: number, contract: Contract, round: number) {
  const endTx = await contract["endRound()"]();
  await endTx.wait();
  const deposits: any = {};
  for (const address of sim.addresses) {
    const deposit = await contract["depositsOf(uint256,address)"](
      round,
      address
    );
    deposits[address] = Number(deposit);
  }
  writeFileSync(
    `data/${id}/rounds/${round}/deposit.json`,
    JSON.stringify(deposits, null, 2)
  );
}

async function simulate(id: number, n: number) {
  const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
  const schneeball = await Schneeball.deploy(ethers.constants.AddressZero);
  console.log("Contract deployed!");
  for (let round = 1; round <= n; round++) {
    console.log(`Game ${id}:\tRound ${round} started!`);
    await initRound(id, round, schneeball);
    while (true) {
      try {
        await simulateRound(id, schneeball);
      } catch (e: any) {
        if (e.toString().includes("Finished")) {
          console.log(`Game ${id} has finished`);
          await payout(id, schneeball, round);
          await save(id, schneeball, round);
          break;
        } else if (e.toString().includes("revert")) {
          console.log(e);
          break;
        }
      }
    }
  }
}

async function main() {
  const wallets = await ethers.getSigners();
  for (const wallet of wallets) {
    sim.addresses.push(await wallet.getAddress());
  }
  const id = Date.now() + randomInt(1000);
  simulate(id, 10);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
