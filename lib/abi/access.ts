export const erc20BalanceOfAbi = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export const erc721BalanceOfAbi = erc20BalanceOfAbi;
