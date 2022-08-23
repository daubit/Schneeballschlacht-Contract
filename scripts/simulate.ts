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
import { ethers, ethernal } from "hardhat";
import { Simulation } from "./simulation";
import { Action, ActionType } from "./types";
import {
  DEPOSIT_FILE,
  getLevel,
  getToken,
  hasTokens,
  sleep,
  HISTORY_FILE,
  makePath,
  MINT_FEE,
  ROUNDS_FOLDER,
  ROUND_FILE,
  TOKEN_FILE,
  TOSS_FEE,
} from "./utils";
import { REGISTRY_ADDRESS_TESTNET } from "./util/const.json";

let history: Action[] = [];

const sim = new Simulation();
const MINTER_ROLE =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

async function newRound(id: number, round: number, schneeball: Contract) {
  const path = makePath(id, ROUNDS_FOLDER, round);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.log(`Folder ${path} created`);
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
      gasUsed: transferTx.gasLimit.toNumber(),
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
      gasUsed: mintTx.gasLimit.toNumber(),
    });
  }
}

async function saveRound(id: number, schneeball: Contract, round: number) {
  const roundData: any = {};
  const winner = await schneeball["getWinner()"]();
  const payout = await schneeball["getPayout()"]();
  const tosses = await schneeball["totalTosses()"]();
  const totalSupply = await schneeball["totalSupply()"]();
  const payoutPerToss = await schneeball["getPayoutPerToss(uint256)"](round);
  roundData.winner = winner;
  roundData.payout = Number(payout);
  roundData.tosses = Number(tosses);
  roundData.totalSupply = Number(totalSupply);
  roundData.payoutPerToss = Number(payoutPerToss);
  roundData.contractAddress = schneeball.address;
  writeFileSync(
    makePath(id, ROUNDS_FOLDER, round, ROUND_FILE),
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
    makePath(id, ROUNDS_FOLDER, round, TOKEN_FILE),
    JSON.stringify(addressData, null, 2)
  );
}

async function save(id: number, contract: Contract, round: number) {
  await saveRound(id, contract, round);
  await saveTokens(id, contract, round);
  writeFileSync(
    makePath(id, ROUNDS_FOLDER, round, HISTORY_FILE),
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
    makePath(id, ROUNDS_FOLDER, round, DEPOSIT_FILE),
    JSON.stringify(deposits, null, 2)
  );
}

async function withdrawAll(id: number, contract: Contract, round: number) {
  for (const address of sim.addresses) {
    try {
      const signer = await ethers.getSigner(address);
      const withdraw = await contract
        .connect(signer)
        ["withdraw(uint256,address)"](round, address);
      await withdraw.wait();
    } catch (e) {
      console.log(
        `tried to withdraw but got error, may or may not really matter ${e}`
      );
    }
  }
}

async function simulate(id: number, n: number, maxLevel: number) {
  const HOF = await ethers.getContractFactory("HallOfFame");
  const hof = await HOF.deploy("ipfs://", "ipfs://", REGISTRY_ADDRESS_TESTNET);
  await ethernal.push({
    name: "HallOfFame",
    address: hof.address,
  });
  const EscrowManager = await ethers.getContractFactory("EscrowManager");
  const em = await EscrowManager.deploy();
  await ethernal.push({
    name: "EscrowManager",
    address: em.address,
  });
  const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
  const schneeball = await Schneeball.deploy(
    hof.address,
    em.address,
    maxLevel,
    "ipfs://",
    "ipfs://",
    REGISTRY_ADDRESS_TESTNET,
    2,
    1
  );
  await ethernal.push({
    name: "Schneeballschlacht",
    address: schneeball.address,
  });
  console.log("Contract deployed!");
  let grantRoleTx = await hof.grantRole(MINTER_ROLE, schneeball.address);
  await grantRoleTx.wait();
  console.log("Schneeballschlacht has been granted MINTER_ROLE");
  grantRoleTx = await em.grantRole(await em.ESCROW_ROLE(), schneeball.address);
  await grantRoleTx.wait();
  console.log("Schneeballschlacht has been granted ESCROW_ROLE");

  for (let round = 1; round <= n; round++) {
    console.log(`Game ${id}:\tRound ${round} started!`);
    await newRound(id, round, schneeball);
    while (true) {
      try {
        await simulateRound(id, schneeball);
      } catch (e: any) {
        if (
          e.toString().includes("Pausable: paused") ||
          e.toString().includes("Finished")
        ) {
          console.log(`Game ${id} has finished`);

          await payout(id, schneeball, round);
          await withdrawAll(id, schneeball, round);
          await ethernal.push({
            name: "Escrow",
            address: await schneeball.getEscrow(round),
          });
          await save(id, schneeball, round);
          break;
        } else if (e.toString().includes("Cooldown")) {
          const from = e.transaction.from;
          console.log(`Game ${id}:\t${from} is on cooldown!`);
          await sleep(1000);
          continue;
        } else if (e.toString().includes("Timeout")) {
          const from = e.transaction.from;
          console.log(`Game ${id}:\t${from} is on timeout!`);
          await sleep(1000);
          continue;
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
  const max = 3;
  const id = Date.now() + randomInt(1000);
  await simulate(id, 1, max);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
