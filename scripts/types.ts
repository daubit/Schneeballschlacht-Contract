export interface RoundMeta {
  winner: string;
  payout: number;
  tosses: number;
  totalSupply: number;
  payoutPerLevel: number;
}

export enum ActionType {
  "Mint",
  "Toss",
}

export interface Action {
  type: ActionType;
  tokenId: number | undefined;
  level: number | undefined;
  from: string | undefined;
  to: string;
  timestamp: number;
  gasUsed: number;
}
export type History = Action[];

export interface Deposits {
  [address: string]: number;
}

export interface Token {
  level: number;
  tokenId: number;
}

export interface Tokens {
  [address: string]: Token[];
}
