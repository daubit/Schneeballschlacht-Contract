/* eslint-disable node/no-missing-import */
/* eslint-disable object-shorthand */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Contract } from "ethers";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import { Simulation } from "./simulation";
import { Action, ActionType } from "./types";
import { TOSS_FEE, MINT_FEE, getLevel, getToken, hasTokens } from "./utils";

const history: Action[] = [];
const sim = new Simulation();

async function main() {
  const wallets = await ethers.getSigners();
  for (const wallet of wallets) {
    sim.addresses.push(await wallet.getAddress());
  }
  const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
  const schneeball = await Schneeball.deploy();
  console.log("Contract deployed!");
  const startTx = await schneeball.startRound();
  await startTx.wait();
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
        });
      } else {
        console.log(`${currentAddress} minted...`);
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
    } catch (e: any) {
      if (e.toString().includes("Finished")) {
        console.log("Clean up!");
        cleanup(schneeball);
        break;
      }
    }
  }

  const total = Number(await schneeball["totalSupply()"]());
  const addressData: { [address: string]: any[] } = {};
  const roundData: any = {};
  const winner = await schneeball["getWinner()"]();
  const payout = await schneeball["getPayout()"]();
  const tosses = await schneeball["totalTosses()"]();
  const totalSupply = await schneeball["totalSupply(uint256)"](1);
  roundData.winner = winner;
  roundData.payout = Number(payout);
  roundData.tosses = Number(tosses);
  roundData.totalSupply = Number(totalSupply);
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

async function cleanup(contract: Contract) {
  // TODO: Test lock on transer, mint, toss
  const addresses = sim.addresses;
  const endTx = await contract["endRound()"]();
  await endTx.wait();
  const { token } = await getToken(contract, addresses[0]);
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract.connect(signer)["mint(address)"](addresses[0]);
    throw new Error("Mint not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("Mint locked!");
  }
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract
      .connect(signer)
      ["toss(address,uint256)"](addresses[0], token);
    throw new Error("toss not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("Toss locked!");
  }
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract
      .connect(signer)
      ["transferFrom(address,address,uint256)"](
        addresses[0],
        addresses[1],
        token
      );
    throw new Error("transferFrom not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("TransferFrom locked!");
  }
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract
      .connect(signer)
      ["transferFrom(address,address,uint256)"](
        addresses[0],
        addresses[1],
        token
      );
    throw new Error("safeTransferFrom not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("SafeTransferFrom locked!");
  }
  try {
    await contract["endRound()"]();
    throw new Error("endRound not unlocked!");
  } catch (e: any) {
    console.log(e);
    console.log("endRound locked!");
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
