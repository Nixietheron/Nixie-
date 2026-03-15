# x402 & content access – security summary

## Fixed: CID leak via Supabase anon key

**Issue:** `content` and `stories` had RLS `SELECT using (true)` for anon.  
Anyone could use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in the client bundle) to run:

- `supabase.from('content').select('nsfw_cid, animated_cid')`  
- `supabase.from('stories').select('*')`  

and get all IPFS CIDs, then load paid media from the gateway without paying.

**Fix:**

1. **Migration `00010_content_stories_admin_only_select.sql`**  
   - `content`: only `service_role` can `SELECT`.  
   - `stories`: only `service_role` can `SELECT`.

2. **Backend**  
   All reads of `content` and `stories` now use `createAdminClient()` (service_role) in:
   - `lib/supabase/data.ts`: getContentWithCounts, getTrendingArtworks, getNsfwCidIfAllowed, getAnimatedCidIfAllowed, getActiveStories, getStoriesForAdmin, getListWithArtworks  
   - `app/api/unlock/route.ts`: content read for price check  
   - `app/api/story-unlock/route.ts`: story read for price/expiry  

After applying the migration and deploying, anon can no longer read `content` or `stories`; CIDs are only available server-side.

---

## Current security model

### 1. Paid content (NSFW / Animated)

- **Unlock:** POST `/api/unlock` with wallet + contentId (+ payment-signature for x402).  
  Server checks `unlocks` (admin client), then content price; for price &gt; 0 it requires valid x402 payment and writes to `unlocks` with service_role.
- **Image URL:** Client only gets a proxy URL, e.g. `/api/ipfs-image?contentId=...&wallet=...` (no raw CID).
- **Serving:** GET `/api/ipfs-image` calls `getNsfwCidIfAllowed(wallets, contentId)` / `getAnimatedCidIfAllowed(...)`, which use **admin** to read `content` and `unlocks`. CID is returned only if at least one of the given wallets has unlock (or content is free). Otherwise 403.

So: no payment → no unlock row → no CID returned → no access.

### 2. Wallet in URL (design trade-off)

- Anyone who knows a wallet that has unlocked a piece of content can call  
  `/api/ipfs-image?contentId=...&wallet=0xThatWallet` and get the image.
- Wallet addresses are public on-chain; after a payment, “wallet W paid for content C” is visible.
- So “pay once, access only with that wallet” is enforced, but “only the key holder can use that wallet” is not: the design uses wallet as the proof, not a signature from that wallet.  
  Strengthening would require the client to sign a message and the server to verify the signature before returning the image.

### 3. x402 payment

- Unlock with price &gt; 0 requires a valid `payment-signature` (or equivalent) header.
- Server uses CDP to verify and settle; only after that does it insert into `unlocks`.  
  No way to insert an unlock without going through the real payment path (or free path with price 0).

### 4. No CID in API responses

- Feed/content APIs return artwork objects where:
  - `nsfwFull` is either `""` or the proxy URL (never raw CID).
  - `animatedVersion` is either `undefined` or the proxy URL.
- So even if someone bypasses the front end, they never see CIDs in normal API responses.

---

## Apply the fix

1. Run the new migration on your Supabase project (Dashboard → SQL or `supabase db push`):
   - `supabase/migrations/00010_content_stories_admin_only_select.sql`
2. Deploy the updated app (data.ts + unlock + story-unlock routes).

After that, only the backend (service_role) can read `content` and `stories`; anon can no longer exfiltrate CIDs.
