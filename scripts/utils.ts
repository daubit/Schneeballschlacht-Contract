import { parseEther } from "ethers/lib/utils";

export const TOSS_FEE = (level: number) =>
  parseEther((0.001 * level).toFixed(10));

export const MINT_FEE = parseEther("0.1");
