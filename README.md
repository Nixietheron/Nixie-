# Nixie Museum

Nixie is a private 3D museum. Entry is granted only to wallets that hold the Nixie ERC-20 token or a Nixie NFT on Robinhood Mainnet.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set the official Robinhood Mainnet chain ID, RPC URL, and the token and/or NFT contract address.
3. Set `AUTH_SECRET` to a long random value and configure Supabase and Pinata if you use the profile and artwork catalog.
4. Run `npm run dev`.

The entry API is fail-closed: until a valid `ROBINHOOD_TOKEN_ADDRESS` or `ROBINHOOD_NFT_ADDRESS` is set, the museum cannot be entered. Token ownership is checked with `balanceOf(address) >= ROBINHOOD_MIN_TOKEN_AMOUNT`. Set `ROBINHOOD_TOKEN_DECIMALS` to the deployed ERC-20 decimal count (18 by default); `ROBINHOOD_MIN_TOKEN_AMOUNT` is a human-readable value such as `500000`. NFT ownership is checked with `balanceOf(address) > 0`.

## Telegram NIX buy alerts

`/api/telegram/buy-alerts` is a protected cron worker. It reads confirmed ERC-20 `Transfer` logs and publishes an alert only when NIX leaves a configured, verified DEX liquidity-pool address. This avoids treating wallet-to-wallet transfers as buys.

1. Create a bot with [@BotFather](https://t.me/BotFather), add it to the Nixie group/channel as an administrator, and set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
2. Set `NIX_BUY_POOL_ADDRESSES` to the actual NIX pool address(es), comma-separated. Do not use the token contract address here. Set `NIX_BUY_RPC_URL` when the worker should use a dedicated RPC quota; it otherwise falls back to `ROBINHOOD_RPC_URL`.
3. Apply `supabase/migrations/00018_telegram_buy_alerts.sql`, then schedule it every 1–5 minutes with `Authorization: Bearer $CRON_SECRET`. External schedulers can use `POST`; Vercel Cron calls `GET` and supplies that header automatically when `CRON_SECRET` is set. Add the following only if the Vercel plan supports a sub-daily cron schedule:

```json
{
  "crons": [{ "path": "/api/telegram/buy-alerts", "schedule": "*/5 * * * *" }]
}
```

Every alert is sent as a Telegram photo card, with the Nixie after-hours visual, the buy amount and buyer wallet in the caption, plus Noxa and Dexscreener buttons. `public/nix-buy-alert.png` is used by default; set `NIX_BUY_ALERT_IMAGE_URL` only when you host a different HTTPS image. If the RPC is Alchemy Free, keep `NIX_BUY_LOG_BLOCK_RANGE=10` and `NIX_BUY_LOG_REQUEST_DELAY_MS=500`; the worker automatically batches and paces larger catch-up ranges within its limits.

The first successful call only records the current confirmed block; it deliberately does not announce old transactions. Later calls are idempotent: delivered event IDs are stored in Supabase, and failed Telegram sends remain queued for the next run.
