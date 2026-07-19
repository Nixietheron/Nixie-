# Nixie Genesis launch checklist

## Robinhood mainnet deployment

- Contract: `0xd092B7e9FC3e2684b59B83212394d293E6a89550`
- Deployment transaction: `0x2f5f8b7bb87245907f41763ec8eafdcb2d24a12ea00151a48ae2e03b80dbdb2a`
- Sale activation transaction: `0xb50adf3d633e8b386d0e400e7c51ef677e52e1d74a1bb851390cf8d46ced57b1`
- Collection metadata: `ipfs://QmSAzgXDmSkk5KnmkKaRUskFrsW1hY74trMzWKbiKoEHCX`
- Source is verified on Robinhood Chain Blockscout.
- All 20 token URIs are configured and permanently frozen after OpenSea presentation was inspected.

## Collection invariants

- ERC-1155 token IDs `1` through `20` map to the Nixie names in `lib/nft-collection.ts`.
- Every ID has exactly 50 editions, for a hard maximum of 1,000 NFTs.
- A wallet can mint no more than three NFTs for the life of the sale.
- The contract transfers $NIX directly from the buyer to the treasury; it does not retain primary-sale funds.
- The royalty receiver is the treasury and the royalty is fixed at 5%.

## Before testnet deployment

1. Keep the existing Pinata credentials server-side only. Never expose them through a `NEXT_PUBLIC_` variable, frontend bundle, Git commit, or browser request.
2. Normalize the 20 artwork files to one final canvas size and assign each file to token ID `1`–`20`.
3. Upload images and the 20 token metadata JSON files to Pinata/IPFS. Set the per-ID URI with `setTokenURI`.
4. Upload collection metadata (name, description, icon, banner, external link, collaborators) and pass its `ipfs://...` URI to the constructor.
5. Create a dedicated hot quote-signing wallet. It must not be the owner or treasury wallet. Put only this key in `NIXIE_PRICE_SIGNER_PRIVATE_KEY`.
6. Deploy to Robinhood testnet (chain ID 46630) using a test ERC-20 that mimics NIX approvals and transfers.

## Production environment

```bash
NEXT_PUBLIC_NIXIE_NFT_ADDRESS=0xDeployedNixieGenesisAddress
ROBINHOOD_NFT_ADDRESS=0xDeployedNixieGenesisAddress
NIXIE_NFT_CHARACTER_COUNT=20
NIXIE_PRICE_SIGNER_PRIVATE_KEY=0xDedicatedQuoteSignerPrivateKey
NIXIE_MIN_LIQUIDITY_USD=1000
NIXIE_MAX_NIX_PRICE_USD=0.000012
NIXIE_MAX_PRICE_CHANGE_5M_PERCENT=25
NIXIE_QUOTE_RATE_LIMIT_PER_MINUTE=20
```

`/api/nft/quote` reads the NIX/WETH Dexscreener pair, calculates the number of NIX needed for USD 5 per NFT, and signs a short-lived EIP-712 quote. The contract rejects expired, reused, altered, or incorrectly signed quotes. The API also verifies that its signer matches the signer stored in the deployed contract, refuses owner/treasury key reuse, rate-limits quote requests, rejects low-liquidity pricing, and stops above the configured price ceiling or during sudden five-minute price moves.

## Accepted limitations and launch risks

- Immediate reveal without VRF or a commit/reveal round is not provably random. A block producer can influence block inputs, and a contract buyer can reject an unwanted ERC-1155 receipt and retry. Describe the sale as an immediate pseudo-random chance draw: the buyer chooses only the quantity and sees whichever available character is drawn after minting.
- Dexscreener is a signed spot-price input, not a trustless USD oracle or TWAP. The liquidity floor and maximum-price ceiling reduce obvious bad quotes but cannot eliminate short-lived market manipulation. Keep the quote signer isolated and monitor the pool during the sale.
- The application rate limit is in memory and applies per running server instance. Add a platform-level distributed limit (for example at the CDN or hosting layer) before a high-traffic launch.
- Run a Robinhood testnet rehearsal and obtain an independent Solidity audit before mainnet deployment. Keep the existing Pinata credentials restricted to trusted server-side upload tooling.

## Mainnet launch order

1. Deploy with the treasury `0xd946d82224841038E3970ff87E70e291eacDc84C`, the NIX ERC-20 address, and the dedicated quote signer.
2. Verify the source on Robinhood Chain Blockscout.
3. Set all 20 token URIs, inspect them on OpenSea, then call `freezeTokenMetadata()`.
4. Set the production contract address in the environment and redeploy the site.
5. Test a one-NFT mint with the owner account before calling `setSaleActive(true)`.
6. Enable the OpenSea Explicit & Sensitive setting and set the editable collection details in OpenSea Studio.
7. Publish the contract address, treasury address, price method, wallet cap, and random-mint terms before public launch.

The final collection metadata is pinned and active at `ipfs://QmfGCckYg5EYoi71iLE5PpQHXqJvYa6berMauYSGvmxByY`. OpenSea was inspected successfully, and all 20 token metadata URIs were permanently frozen in transaction `0x4f9305386843e159f3fe2c3345758a7e566ad1b859ee5e90f1957ad965c21587`.

## Owner controls

The owner can pause/unpause sales, rotate the treasury and quote signer, update collection-level metadata, and freeze the token metadata permanently. The owner cannot create NFTs above the fixed 1,000 supply or above 50 for any character.
