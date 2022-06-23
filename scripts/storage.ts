import { readFileSync, writeFileSync } from "fs";

export interface AddrStorage {
  [contract: string]: string;
}

export interface ChainStorage {
  [network: number]: AddrStorage;
}

export class Storage {
  path = "contracts/addresses.json";
  addresses: ChainStorage;

  constructor(filePath: string) {
    this.addresses = {};
    this.path = filePath;
  }

  fetch(network: number) {
    this.addresses = JSON.parse(readFileSync(this.path, "utf8"));
    return this.addresses[network] || {};
  }

  save(network: number, addresses: AddrStorage) {
    this.addresses[network] = { ...this.addresses[network], ...addresses };
    const result = JSON.stringify(this.addresses, null, 2);
    writeFileSync(this.path, result);
  }
}
