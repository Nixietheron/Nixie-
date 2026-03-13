# Nixie

Base ağında çalışan bir Web3 mini uygulaması. SFW önizlemeleri ücretsiz, NSFW içerik USDC (x402) ile açılıyor.

## Kurulum

```bash
npm install
cp .env.example .env
# .env dosyasını düzenleyin: Supabase, Pinata, isteğe bağlı ADMIN_EMAIL, X402_RECIPIENT_WALLET, NEXT_PUBLIC_APP_URL
```

## Supabase

1. [Supabase](https://supabase.com) projesi oluşturun.
2. SQL Editor'da `supabase/migrations/00001_initial_schema.sql` içeriğini çalıştırın.
3. Realtime istiyorsanız Dashboard > Database > Replication altından `comments` ve `likes` tablolarını ekleyin.
4. Auth > Providers ile Email açın; admin için bir kullanıcı oluşturun.
5. `.env` içine `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ekleyin.

## Admin paneli

- `/admin` — Giriş yapılmışsa upload + yayınlama formu.
- `/admin/login` — E-posta/şifre ile giriş.
- `ADMIN_EMAIL` ile sadece bu e-postayı admin kabul edebilirsiniz (boş bırakırsanız giriş yapan herkes admin sayılır).
- Pinata: `PINATA_API_KEY` ve `PINATA_SECRET_KEY` gerekli (görsel yükleme için).

### Admin girişi kurulumu

**1. .env dosyası (Supabase hatası alıyorsanız)**  
Proje kökünde `.env` dosyası olmalı (`.env.example` değil). Yoksa:
```bash
cp .env.example .env
```
`.env` içinde `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` dolu olmalı. Değişiklikten sonra `npm run dev` **yeniden başlatın**.

**2. Supabase’de admin kullanıcı + e-posta onayı**  
- **Authentication → Users → Add user → Create new user**  
  E-posta ve şifre gir; açılır veya formun altında **“Auto confirm user”** (veya “Confirm email”) işaretli olsun. Kaydet.  
- Alternatif: **Authentication → Providers → Email** içinde **“Confirm email”** (Kaydı onayla) ayarını **kapatırsan** tüm yeni kullanıcılar e-posta doğrulamadan giriş yapabilir; sonra Users’tan Add user ile admin ekleyebilirsin.

## Base Mini App / Farcaster

- Manifest: `/.well-known/farcaster.json` (Next.js route).
- `fc:miniapp` metadata root layout’ta tanımlı.
- Base Build’de hesap doğrulaması için `FARCASTER_ACCOUNT_HEADER`, `FARCASTER_ACCOUNT_PAYLOAD`, `FARCASTER_ACCOUNT_SIGNATURE` ekleyin ve manifest’e yapıştırın.

## Ödemeler (x402)

- `X402_RECIPIENT_WALLET` ayarlı değilse unlock isteği “mock” modda çalışır (ödeme olmadan kayıt).
- Ayarlıysa API 402 döner; istemci USDC (Base) gönderir, `txHash` ile tekrar unlock çağırır.

## Çalıştırma

```bash
npm run dev
```

Build:

```bash
npm run build
npm start
```

## Proje yapısı

- `app/` — Sayfalar (splash, feed, admin).
- `components/nixie/` — Nixie UI bileşenleri (Figma tasarımına uygun).
- `lib/` — Supabase, Pinata, constants, types.
- `app/api/` — content, comments, like, unlock, upload, publish.
