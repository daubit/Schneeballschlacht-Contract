/* eslint-disable node/no-missing-import */
/* eslint-disable object-shorthand */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import { Simulation } from "./simulation";
import { Action, ActionType } from "./types";
import { TOSS_FEE, MINT_FEE, getLevel, getToken, hasTokens } from "./utils";

const history: Action[] = [];
const sim = new Simulation();
const MINTER_ROLE =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

async function deploy() {
  const wallets = await ethers.getSigners();
  for (const wallet of wallets) {
    sim.addresses.push(await wallet.getAddress());
  }
  const Hof = await ethers.getContractFactory("HallOfFame");
  const hof = await Hof.deploy();
  console.log("HallOfFame deployed!");
  const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
  const schneeball = await Schneeball.deploy(hof.address);
  console.log("Schneeballschlacht deployed!");
  const grantRoleTx = await hof.grantRole(MINTER_ROLE, schneeball.address);
  await grantRoleTx.wait();
  console.log("Schneeballschlacht has been granted MINTER_ROLE");
  const startTx = await schneeball.startRound();
  await startTx.wait();
  return { schneeball, hof };
}

async function save(schneeball: Contract) {
  const total = Number(await schneeball["totalSupply()"]());
  const addressData: { [address: string]: any[] } = {};
  const roundData: any = {};
  const winner = await schneeball["getWinner()"]();
  const payout = await schneeball["getPayout()"]();
  const tosses = await schneeball["totalTosses()"]();
  roundData.winner = winner;
  roundData.payout = Number(payout);
  roundData.tosses = Number(tosses);
  roundData.totalSupply = Number(total);
  writeFileSync("data/round.json", JSON.stringify(roundData, null, 2));
  writeFileSync("data/history.json", JSON.stringify(history, null, 2));

  for (let i = 1; i <= total; i++) {
    const owner = await schneeball["ownerOf(uint256)"](i);
    const level = await getLevel(schneeball, i);
    const entry = { tokenId: i, level: level };
    if (addressData[owner]) {
      addressData[owner].push(entry);
    } else {
      addressData[owner] = [entry];
    }
  }
  writeFileSync("data/tokens.json", JSON.stringify(addressData, null, 2));
}

async function checkLocked(
  signer: SignerWithAddress,
  func: string,
  contract: Contract,
  ...param: any
) {
  const funcName = func.split("(")[0];
  try {
    await contract.connect(signer)[func](...param);
    throw new Error(`${funcName} not unlocked!`);
  } catch (e) {
    console.log(e);
    console.log(`${funcName} locked!`);
  }
}

async function cleanup(contract: Contract, hof: Contract) {
  const addresses = sim.addresses;
  const endTx = await contract["endRound()"]();
  await endTx.wait();
  const { token } = await getToken(contract, addresses[0]);
  const funcs = [
    { func: "toss(address,uint256)", args: [addresses[0], token] },
    { func: "mint(address)", args: [addresses[0]] },
    {
      func: "transferFrom(address,address,uint256)",
      args: [addresses[0], addresses[1], token],
    },
    {
      func: "safeTransferFrom(address,address,uint256)",
      args: [addresses[0], addresses[1], token],
    },
    { func: "endRound()", args: [] },
  ];
  const signer = await ethers.getSigner(addresses[0]);
  for (const funcObj of funcs) {
    const { func, args } = funcObj;
    await checkLocked(signer, func, contract, ...args);
  }
  const ownerOfTx = await hof.ownerOf(1);
  console.log(`\nWinner: ${ownerOfTx}`);
}

async function main() {
  const { schneeball, hof } = await deploy();
  console.log("Round started!");
  while (true) {
    try {
      const signer = await sim.getRandomSigner();
      const currentAddress = signer.address;
      const { token: tokenId, level } = await getToken(
        schneeball,
        currentAddress
      );
      const canThrow = await hasTokens(schneeball, currentAddress);
      if (canThrow && tokenId > 0) {
        const randAddress = sim.getRandomAddress(currentAddress, tokenId);
        sim.addPartner(tokenId, randAddress);
        const transferTx = await schneeball
          .connect(signer)
          .toss(randAddress, tokenId, {
            value: TOSS_FEE(level),
          });
        await transferTx.wait();
        console.log(
          `${currentAddress} tossed to ${randAddress} with tokenId ${tokenId} at ${level}`
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
        console.log(`${currentAddress} minted...`);
        const mintTx = await schneeball.connect(signer).mint(currentAddress, {
          value: MINT_FEE,
        });
        await mintTx.wait();
        history.push({
          timestamp: Date.now(),
          type: ActionType.Mint,
          from: undefined,
          to: currentAddress,
          tokenId: undefined,
          level: 1,
          gasUsed: mintTx.gasLimit.toNumber(),
        });
      }
    } catch (e: any) {
      if (e.toString().includes("Pausable: paused")) {
        console.log("Clean up!");
        await cleanup(schneeball, hof);
        await save(schneeball);
      } else {
        console.log(e);
      }
      break;
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
