# Nixie Museum

Nixie is a private 3D museum. Entry is granted only to wallets that hold the Nixie ERC-20 token or a Nixie NFT on Robinhood Mainnet.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set the official Robinhood Mainnet chain ID, RPC URL, and the token and/or NFT contract address.
3. Set `AUTH_SECRET` to a long random value and configure Supabase and Pinata if you use the profile and artwork catalog.
4. Run `npm run dev`.

The entry API is fail-closed: until a valid `ROBINHOOD_TOKEN_ADDRESS` or `ROBINHOOD_NFT_ADDRESS` is set, the museum cannot be entered. Token ownership is checked with `balanceOf(address) >= ROBINHOOD_MIN_TOKEN_AMOUNT`. Set `ROBINHOOD_TOKEN_DECIMALS` to the deployed ERC-20 decimal count (18 by default); `ROBINHOOD_MIN_TOKEN_AMOUNT` is a human-readable value such as `500000`. NFT ownership is checked with `balanceOf(address) > 0`.
