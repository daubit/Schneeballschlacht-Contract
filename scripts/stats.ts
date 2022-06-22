import * as tokenData from "../data/tokens.json";

interface Token {
  level: number;
  tokenId: number;
}

interface Tokens {
  [address: string]: Token[];
}
function main(tokenData: Tokens) {
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

main(tokenData);
