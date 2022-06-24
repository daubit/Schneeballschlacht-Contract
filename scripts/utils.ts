import { parseEther } from "ethers/lib/utils";

export const TOSS_FEE = (level: number) =>
  parseEther((0.01 * level).toFixed(10));

export const MINT_FEE = parseEther("0.05");
