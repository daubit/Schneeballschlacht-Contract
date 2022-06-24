export interface RoundMeta {
  winner: string;
  payout: number;
  tosses: number;
  totalSupply: number;
  payoutPerLevel: number;
}

export interface Action {
  type: "Mint" | "Toss";
  tokenId: number | undefined;
  level: number | undefined;
  from: string | undefined;
  to: string;
  timestamp: number;
}
export type History = Event[];

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
