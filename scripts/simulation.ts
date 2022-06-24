import { randomInt } from "crypto";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

export class Simulation {
  addresses: string[] = [];
  partners: { [tokenId: number]: string[] } = {};

  async hasTokens(contract: Contract, address: string) {
    const balance = await contract["balanceOf(address)"](address);
    return Number(balance) > 0;
  }

  async getLevel(contract: Contract, tokenId: number | BigNumber) {
    return Number(await contract.functions["getLevel(uint256)"](tokenId));
  }

  async getToken(contract: Contract, address: string) {
    const tokens = await contract["getTokensOfAddress(address)"](address);
    let maxToken = -1;
    let tmpLevel = 0;
    let tmpAmount = -1;
    for (const token of tokens) {
      const level = await this.getLevel(contract, token);
      const partners = await contract["getPartnerTokenIds(uint256)"](token);
      if (tmpLevel < level && partners.length < level + 1) {
        tmpLevel = level;
        maxToken = token;
      } else if (tmpLevel === level) {
        if (tmpAmount < 0 && partners.length < level + 1) {
          tmpAmount = partners.length;
          maxToken = token;
          tmpLevel = level;
          continue;
        } else if (tmpAmount < partners.length && partners.length < level + 1) {
          maxToken = token;
          tmpAmount = partners.length;
        }
      }
    }
    return { token: maxToken, level: tmpLevel };
  }

  getRandomAddress(currentAddress: string, tokenId: number) {
    const { addresses } = this;
    const randIndex = randomInt(addresses.length);
    let randAddress = addresses[randIndex];
    if (!this.partners[tokenId]) {
      this.partners[tokenId] = [];
    }
    while (
      randAddress === currentAddress ||
      this.partners[tokenId].includes(randAddress)
    ) {
      const randIndex = randomInt(addresses.length);
      randAddress = addresses[randIndex];
    }
    return randAddress;
  }

  addPartner(tokenId: number, address: string) {
    if (this.partners[tokenId]) {
      this.partners[tokenId].push(address);
    } else {
      this.partners[tokenId] = [address];
    }
  }

  newPartner(address: string, tokenId: number) {
    const randAddress = this.getRandomAddress(address, tokenId);
    this.addPartner(tokenId, randAddress);
    return randAddress;
  }

  async getRandomSigner() {
    const { addresses } = this;
    const randIndex = randomInt(addresses.length);
    const currentAddress = addresses[randIndex];
    const signer = await ethers.getSigner(currentAddress);
    return signer;
  }
}
