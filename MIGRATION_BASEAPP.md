# Base App Migration (Farcaster Mini App → Standard Web App)

Bu doküman, mevcut **Nixie** (Next.js) projesini hem **web tarayıcıda** hem de **Base App içindeki in-app browser**’da sorunsuz çalışacak şekilde “standart web app + wallet” modeline taşımak içindir.

## Kısa özet (Nixie için mevcut durum)

- **Zaten var**: `wagmi`, `viem`, `@tanstack/react-query`, Base chain (`lib/wagmi-config.ts`), provider sarmalayıcı (`components/providers.tsx`)
- **Uygulanan değişiklikler (repo şu an)**:
  - Farcaster SDK/manifest/meta tag’leri kaldırıldı (Base App “standard web app” modeline uygun)
  - `@base-org/account` + wagmi `baseAccount(...)` connector eklendi
  - Base.dev doğrulaması için `base:app_id` meta eklendi (`app/layout.tsx`)
  - Paylaşım önizlemesi için OG/Twitter metadata eklendi (`app/layout.tsx`)
  - Base Account popup uyumluluğu için COOP/COEP header’ları eklendi (`next.config.mjs`)
- **Not**: Base App, 9 Nisan 2026’dan sonra Farcaster manifest’lerini temel almayıp tüm uygulamaları **standart web app** gibi ele alacak. Bu yüzden Farcaster SDK/manifest’e bağlı kalmayın.

## Hedef mimari

- **UI**: Aynı Next.js uygulaması (web + Base App)
- **Wallet**: `wagmi + viem` (Base chain)
- **Auth (gerekiyorsa)**: SIWE (Sign-In with Ethereum)
- **App keşif/metadata**: Base.dev projesi (manifest yerine)

## Pre-flight checklist (bitince “migrated” sayın)

- [x] Farcaster SDK/manifest/import’ları temizlendi
- [x] Kimlik: wallet address (FID yok)
- [x] Wallet etkileşimleri `wagmi/viem` ile çalışıyor
- [ ] (Opsiyonel) Auth gerekiyorsa SIWE akışı var ve replay koruması server-side yapılıyor
- [ ] Base.dev üzerinde proje kaydı yapıldı ve metadata tamamlandı (primary URL, icon, screenshots, builder code, vb.)

---

## 1) Farcaster SDK’yı kaldırın

### 1.1. Dependency kaldırma

`package.json` içinde şu paket var:

- `@farcaster/miniapp-sdk`

Bunu kaldırın ve lock dosyanızı güncelleyin.

### 1.2. “ready” çağrısını kaldırma

Base App’te Farcaster SDK methodları (örn. `ready`) artık kullanılmaz. Bu dosyayı kaldırın ya da uygulamadan tamamen çıkarın:

- `components/miniapp-ready.tsx` (içinde `sdk.actions.ready()`)

Uygulamanın “hazır” olması Base App’te sayfanın yüklenmesiyle zaten anlaşılır; ekstra sinyale gerek yok.

---

## 2) Farcaster manifest route’unu opsiyonel hale getirin (veya kaldırın)

Şu route Farcaster mini app manifest’i üretiyor:

- `app/.well-known/farcaster.json/route.ts`

**Base App için artık gerekli değil.**

İki seçenek:

- **Tam kaldırma**: Sadece Base App + web hedefliyorsanız route’u silin.
- **Geçiş dönemi**: Farcaster tarafında halen bir discovery/uyumluluk ihtiyacınız varsa route’u bir süre tutabilirsiniz; Base App bunu yok sayacak. 2026-04-09 sonrası “kritik dependency” olarak düşünmeyin.

---

## 3) Wallet bağlantısını Base App’e uygun hale getirin

Nixie’de şu an wagmi config injection ağırlıklı:

- `lib/wagmi-config.ts` → `connectors: [injected()]`
- `components/providers.tsx` → `WagmiProvider`, `QueryClientProvider`, `RainbowKitProvider`

Base App’in in-app browser’ında **injected** provider her zaman beklediğiniz gibi davranmayabilir; Base’in önerdiği yaklaşım **Base Account connector** eklemektir.

### 3.1. Base Account connector ekleyin (önerilir)

Doküman: `https://docs.base.org/base-account/framework-integrations/wagmi/setup.md`

Kurulum (projede yoksa):

```bash
npm install @base-org/account
```

Sonra wagmi connector listesine `baseAccount(...)` ekleyin. Base dokümanındaki örnek şuna benzer:

```ts
import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { base } from 'wagmi/chains'
import { baseAccount, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    baseAccount({ appName: 'Nixie' }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: { [base.id]: http() },
})
```

> Not: Sizde halihazırda SSR-safe bir storage yaklaşımı var (`lazyLocalStorage`). İsterseniz onu koruyabilirsiniz; ancak Base dokümanındaki cookieStorage yaklaşımı SSR senaryoları için daha deterministik olabilir.

### 3.1.1. Popup best practice (COOP header)

Base Account bazı akışlarda popup açar. Bazı güvenlik header’ları popup’ı kırabilir. Bu yüzden Next.js’te aşağıdaki header’lar önerilir:

- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Cross-Origin-Embedder-Policy: unsafe-none`

Repo’da bu ayar `next.config.mjs` içinde uygulanmıştır.

### 3.2. Zincir zorlaması (switch chain)

Sizde Base chain’e geçiş için bir effect var:

- `components/switch-to-base-effect.tsx`

Bu yaklaşım Base App’te de işe yarar; ancak kullanıcı/connector otomatik Base’e zaten bağlanıyorsa gereksiz hale gelebilir. Migration sonrası davranışı gözleyip sadeleştirin.

---

## 4) Auth ve kimlik: FID → Wallet Address (+ SIWE)

Base App’te Farcaster sign-in ve FID tabanlı kimlik yok. Kimlik olarak:

- **EVM kimliği**: `useAccount()` → `address`

Eğer “login” benzeri bir doğrulama gerekiyorsa SIWE kullanın:

- SIWE utilities: `https://viem.sh/docs/siwe/utilities/createSiweMessage`
- Base Account rehberi (önerilen server pattern): `https://docs.base.org/base-account/guides/authenticate-users.md`

### Önerilen minimum yaklaşım

- Frontend: SIWE mesajı oluştur + imzalat
- Backend: nonce üret + imzayı doğrula + session/cookie ver + nonce replay koruması uygula

> Sizde zaten Supabase var. İsterseniz SIWE sonrası bir “session” tablosu veya Supabase Auth dışı custom oturum yönetimi tasarlayabilirsiniz. Önemli nokta: **nonce** server-side olmalı.

---

## 5) Deprecated Farcaster SDK method mapping (pratik tablo)

Base App’te bu methodlar çağrılmayacak; yerine standart web yaklaşımı:

- **`ready`** → Gerek yok (page load yeterli)
- **`openUrl` / `openMiniApp`** → `window.open(url)` / normal navigation
- **User context / FID** → `wagmi useAccount().address`
- **`signIn`** → SIWE (wagmi `useSignMessage` + backend verify)

---

## 6) Base.dev kaydı ve metadata (keşif / dağıtım)

Base App’te discovery, manifest yerine Base.dev proje metadata’sı ile gelir:

- Proje oluşturun: `https://www.base.dev`
- **Primary URL**: Prod domain’iniz (örn. `https://...`)
- Icon, tagline, description, screenshots, category
- Builder code (varsa): `https://docs.base.org/base-chain/builder-codes/builder-codes`

> Halihazırda kayıtlıysanız metadata’yı güncellemeniz şart değil; ama Base App keşfi için eksiksiz olması önerilir.

---

## 6.1) Paylaşım/preview (logo + kart görseli)

Base App içi discovery/arama kartı çoğunlukla **Base.dev metadata’sından** (icon/screenshot) gelir.

Sosyal paylaşım ve link preview için ise sitenizde **Open Graph** metadata olmalıdır:

- `metadata.openGraph`
- `metadata.twitter`
- `metadata.icons`

Repo’da bu metadata `app/layout.tsx` içinde eklenmiştir. En iyi sonuç için `public/icon.png` ve `public/og.png` gibi kalıcı asset’ler kullanın.

## 7) Nixie için “yapılacaklar” (repo-bağımlı net liste)

### Kaldırılacak / temizlenecek

- [x] `@farcaster/miniapp-sdk` dependency
- [x] `components/miniapp-ready.tsx` ve tüm kullanım noktaları
- [x] `app/.well-known/farcaster.json/route.ts`

### Eklenecek / güncellenecek

- [x] (Önerilir) `@base-org/account` + wagmi `baseAccount` connector
- [ ] (Gerekiyorsa) SIWE auth (backend nonce + verify)
- [ ] Base.dev proje kaydı + metadata (icon/screenshot/builder code dahil)

---

## 8) Test plan (web + Base App)

- Web (mobil Safari/Chrome):
  - [ ] Sayfa açılıyor, hydration yok
  - [ ] Wallet connect çalışıyor
  - [ ] Base chain’de işlem/okuma çalışıyor (varsa)
- Base App:
  - [ ] App URL açılıyor (in-app browser)
  - [ ] Wallet connect ve signing çalışıyor
  - [ ] Base chain’e doğru bağlı
  - [ ] Farcaster SDK kaldırıldıktan sonra hiçbir feature kırılmıyor

