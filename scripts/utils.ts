import { parseEther } from "ethers/lib/utils";

export const TRANSFER_FEE = (level: number) =>
  parseEther((0.001 * level).toFixed(5));

export const MINT_FEE = parseEther("0.1");
