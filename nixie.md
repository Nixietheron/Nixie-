You are helping build a Web3 mini app called **Nixie**.

The UI designs will come from **Figma files** that will be provided later. Your job is to implement the UI and build the application architecture.

This app must run inside the **Base App** as a **standard web app + wallet**, and should follow the official documentation.

IMPORTANT REFERENCES

Study and follow these documents for correct Base App (standard web app) integration:

https://docs.base.org/mini-apps/quickstart/migrate-to-standard-web-app

Understand the Base App migration path and ensure the app is compatible with the Base App in-app browser.

TECH STACK

Frontend

* Next.js 14 (App Router)
* TypeScript
* TailwindCSS
* Mobile-first design
* Wagmi + RainbowKit for wallet connection
* Base network configuration

Backend

* Supabase
* Postgres database
* Supabase Auth (admin login only)
* Supabase Realtime for comments and likes

Storage

* Pinata IPFS
* SFW images stored as public IPFS files
* NSFW images stored as private IPFS files
* Store IPFS CID in database

Payments

* x402 protocol
* Users pay **USDC on Base network**
* After successful payment, record unlock in database

DATABASE TABLES

content

* id (uuid)
* title
* sfw_cid
* nsfw_cid
* animated_cid (optional)
* price_usdc
* created_at

unlocks

* id
* wallet
* content_id
* tx_hash
* created_at

likes

* wallet
* content_id
* created_at

comments

* id
* wallet
* content_id
* text
* created_at

ADMIN PANEL

There is only one creator/admin.

Admin features:

* upload SFW image
* upload NSFW image
* upload animated version (optional)
* set price in USDC
* publish content

Uploads go to Pinata IPFS and return CID values which are stored in Supabase.

APP SCREENS

1. Splash Screen

* Nixie branding
* anime character entering screen animation
* enter button

2. Feed Screen
   Mobile vertical feed of artwork cards.

Each card includes:

* SFW preview image
* blurred NSFW overlay
* like button
* comment button
* unlock button with price in USDC

3. Unlock Flow
   When user taps unlock:

* open modal
* show price
* initiate x402 payment

After payment:

* record unlock
* reveal NSFW version

4. Unlocked View
   Shows:

* NSFW artwork
* optional animated version
* likes
* comments
* tip button

5. Comments Panel
   Bottom sheet style comments UI.
   Realtime updates using Supabase.

LOGIC

If a user has already unlocked content:

* show NSFW version automatically
* do not ask for payment again

Unlock check logic:

wallet_address + content_id

DESIGN

Use styles from provided Figma files.

Color palette:

Primary: #D27A92
Secondary: #E1A1B0
Cards: #ECC1CE
Background: #F7E8EB
Accent: #EFD4CC

UI style:

* soft anime aesthetic
* rounded cards
* minimal mobile UI
* smooth reveal animation when unlocking artwork

GOAL

Build a performant mobile Web3 mini app that:

* runs inside Base Mini App ecosystem
* shows SFW artwork feed
* allows users to unlock NSFW versions via USDC payment
* supports likes and comments
* allows the creator to upload content via admin panel

Before writing code:

1. Analyze the Base Mini App documentation.
2. Generate project architecture and folder structure.
3. Ensure compatibility with Farcaster Mini Apps environment.

Then implement the application.


Create the full project architecture first.
Then implement the Base Mini App integration layer.
Then implement the UI using the Figma files.