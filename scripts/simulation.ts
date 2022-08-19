import { randomInt } from "crypto";
import { ethers } from "hardhat";

export class Simulation {
  addresses: string[] = [];
  partners: { [tokenId: number]: string[] } = {};

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
