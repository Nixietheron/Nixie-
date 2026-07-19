export const nixieGenesisAbi = [
  { name: "MintRevealed", type: "event", anonymous: false, inputs: [{ name: "buyer", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "drawIndex", type: "uint256", indexed: true }] },
  { name: "mintedByWallet", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "remainingSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "saleActive", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [{ name: "quote", type: "tuple", components: [{ name: "buyer", type: "address" }, { name: "quantity", type: "uint256" }, { name: "nixAmount", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] }, { name: "signature", type: "bytes" }], outputs: [] },
] as const;

export const erc20ApprovalAbi = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
