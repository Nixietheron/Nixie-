# x402 Ödeme Altyapısı — Nixie

Bu dokümanda x402 protokolü ve Nixie’de ödeme (Base mainnet) ile NSFW kilidinin nasıl çalıştığı özetlenir.

---

## 1. x402 Nedir?

**x402**, HTTP’nin **402 Payment Required** durum kodunu kullanarak, web kaynakları ve API’ler için **anında, zincir üstü ödeme** sağlayan açık bir protokoldür (Coinbase + ekosistem).

- **Hesap / oturum zorunlu değil:** Ödeme, cüzdan imzası (EIP-712) ve isteğe eklenen ödeme kanıtı ile yapılır.
- **Makine-makine (M2M) uyumlu:** AI agent’ları ve otomasyonlar da aynı HTTP akışıyla ödeyebilir.
- **Düşük maliyet:** Base’de USDC ile CDP facilitator fee-free; gas dışında ek ücretler minimal.

### Temel Akış (Özet)

1. İstemci korumalı kaynağa istek atar (örn. `POST /api/unlock`).
2. Sunucu **402 Payment Required** döner; gerekli tutar, ağ, alıcı ve EIP-712 domain bilgilerini **PAYMENT-REQUIRED** header ve JSON body (`x402Version`, `accepts`) ile iletir.
3. İstemci cüzdanla EIP-3009 ödeme yetkisini imzalar; aynı isteği **X-PAYMENT** (v1) veya **PAYMENT-SIGNATURE** (v2) header’ı ile tekrar gönderir.
4. Sunucu **CDP facilitator** ile ödemeyi verify eder, settle eder; geçerliyse `unlocks` tablosuna yazar ve 200 + isteğe bağlı **PAYMENT-RESPONSE** döner.

---

## 2. x402 Header’ları

| Header              | Yön        | Açıklama |
|---------------------|------------|----------|
| **PAYMENT-REQUIRED** | Sunucu → İstemci | 402 yanıtında; Base64 ile kodlanmış ödeme gereksinimleri. |
| **X-PAYMENT**        | İstemci → Sunucu | x402 **v1** imzalı ödeme payload’ı (Base64). Nixie v1 kullanır. |
| **PAYMENT-SIGNATURE**| İstemci → Sunucu | x402 **v2** imzalı ödeme payload’ı (Base64). |
| **PAYMENT-RESPONSE** | Sunucu → İstemci | Ödeme settle edildikten sonra settlement bilgisi. |

Sunucu hem `X-PAYMENT` hem `PAYMENT-SIGNATURE` header’larını kabul eder (v1/v2 uyumluluğu için).

---

## 3. Ağ Desteği (Base)

| Ağ           | CAIP-2 ID     | v1 ağ adı | Varlık           | Ücret (facilitator) |
|--------------|---------------|-----------|-------------------|----------------------|
| **Base**     | `eip155:8453` | `base`    | EIP-3009 (USDC)   | fee-free (CDP)       |
| Base Sepolia | `eip155:84532`| `base-sepolia` | EIP-3009  | fee-free             |

- **Nixie:** Ödemeler **Base mainnet** (chainId `8453`) üzerinde. İstemci `network: "base"` (v1) ile ödeme oluşturur; USDC adresi Circle’ın Base mainnet USDC’si (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

---

## 4. Facilitator (Doğrulama / Settlement)

Facilitator, ödeme imzasını doğrular ve zincirde settle eder; sunucunun kendi node’unu çalıştırması gerekmez.

- **CDP (Coinbase Developer Platform):** Nixie’de kullanılan facilitator.
  - Base URL: `https://api.cdp.coinbase.com/platform/v2/x402`
  - İşlemler: Verify → Settle (CDP API anahtarları gerekir).

**Nixie’de:** Ödeme **yalnızca x402** ile alınır. Cüzdan EIP-712 ile imza atar; sunucu CDP’ye verify/settle çağrısı yapar. Direkt USDC transfer veya `txHash` kabul edilmez (CDP açıkken).

---

## 5. Nixie’de Ödeme Akışı (Güncel)

1. Kullanıcı “Unlock full artwork” / “Pay with USDC” ile unlock ister.
2. Frontend (Base ağında) `POST /api/unlock` çağrısı yapar: `{ wallet, contentId }`.
3. Sunucu:
   - Zaten unlock varsa: `200 { unlocked: true, already: true }`.
   - CDP + `X402_RECIPIENT_WALLET` set ise: **402** döner; body’de x402 v1 formatı:
     - `x402Version: 1`, `accepts: [{ scheme: "exact", network: "base", maxAmountRequired, payTo, asset, extra: { name: "USD Coin", version: "2" }, ... }]`
     - Header: `PAYMENT-REQUIRED` (Base64).
4. Frontend (`@x402/fetch` + `ExactEvmSchemeV1`):
   - 402’yi parse eder, cüzdanda EIP-3009 imzası ister.
   - Kullanıcı imzayı onaylar.
   - Aynı isteği **X-PAYMENT** header’ı (Base64 payload) ile tekrar gönderir.
5. Sunucu:
   - `X-PAYMENT` veya `PAYMENT-SIGNATURE` header’ını okur, payload’ı decode eder.
   - CDP facilitator’a **verify** sonra **settle** çağrısı yapar.
   - Başarılıysa `unlocks` tablosuna satır ekler, `200 { unlocked: true }` ve isteğe bağlı `PAYMENT-RESPONSE` döner.
6. Frontend içeriği yeniden çeker; NSFW görseli `/api/ipfs-image?contentId=...&wallet=...` ile açılır.

### Teknik notlar

- **EIP-712 domain:** USDC (Circle) için `extra: { name: "USD Coin", version: "2" }` 402 cevabında gönderilir; istemci imza için bu domain’i kullanır.
- **Fiyat:** İçerik bazlı (`content.price_usdc`); 402’de `maxAmountRequired` USDC atomik birim (6 ondalık) olarak iletilir.

---

## 6. Mainnet / Kontrol Listesi

- **Chain:** Wagmi’de `base` (id 8453) → **Base mainnet**.
- **USDC:** `lib/constants.ts` → `USDC_ON_BASE` (Circle Base USDC).
- **Alıcı:** `.env` → `X402_RECIPIENT_WALLET` (ödemelerin gideceği adres).
- **CDP:** `.env` → `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` (facilitator için zorunlu).
- **Cüzdan:** Kullanıcının Base’de **USDC** ve (settlement gas için) **ETH** bulundurması gerekir.

---

## 7. Güvenlik: Ödemeden NSFW Görülmemesi

- **Content API:** Kilitli (ücretli) içerik için `nsfwFull` istemciye **gönderilmez** (boş string). CID sızdırılmaz.
- **Görsel:** NSFW yalnızca `/api/ipfs-image?contentId=...&wallet=...` ile sunulur; bu endpoint `unlocks` tablosunda kayıt yoksa **403** döner.
- Özet: x402 ödemesi verify/settle edilip `unlocks`’a yazılmadan NSFW’e erişim yok.

---

## 8. Referanslar

- [Quickstart for Sellers (CDP)](https://docs.cdp.coinbase.com/x402/quickstart-for-sellers)
- [Setting up CDP Facilitator for Production](https://docs.cdp.coinbase.com/x402/quickstart-for-sellers#setting-up-cdp-facilitator-for-production)
- [x402 Welcome (CDP)](https://docs.cdp.coinbase.com/x402/welcome)
- [HTTP 402 (CDP)](https://docs.cdp.coinbase.com/x402/core-concepts/http-402)
- [x402 Facilitator API (CDP)](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/x402-facilitator)

---

## 9. Yapılandırma ve Etkinleştirme

1. **Alıcı cüzdan:** Base mainnet’te USDC alacak cüzdan. `.env` → `X402_RECIPIENT_WALLET=0x...`
2. **CDP API anahtarları:** [cdp.coinbase.com](https://cdp.coinbase.com) → proje → API anahtarları. `.env` → `CDP_API_KEY_ID=...`, `CDP_API_KEY_SECRET=...`
3. **Sunucuyu yeniden başlat:** Değişikliklerin yüklenmesi için.
4. **Test:** Ücretli NSFW içeriği aç → 402 gelmeli → “Pay with USDC” → cüzdan imzası → unlock ve görsel açılmalı.

Üçü de set edilmezse ücretli içerik için 402 dönülmez (sadece txHash ile unlock edilebilir; Nixie’de CDP açıkken txHash kabul edilmez, yalnızca x402 imzası).

---

## 10. Nixie’de Yapılandırma (.env)

```bash
# Ödemelerin gideceği Base mainnet cüzdan adresi (0x...). Zorunlu (CDP ile birlikte).
X402_RECIPIENT_WALLET=0x...

# CDP facilitator: verify/settle için. Üçü birlikte set edilince gerçek x402 akışı çalışır.
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

- **Üçü de set:** Ücretli içerik için 402 → x402 imzası (X-PAYMENT) → CDP verify/settle → unlock. Direkt transfer veya txHash kabul edilmez.
- **Sadece X402_RECIPIENT_WALLET (CDP yok):** 402 döner; Nixie’de CDP olmadan unlock için txHash ile kayıt yapılabilir (legacy davranış; production’da CDP kullanımı önerilir).

Ödemeler **Base mainnet** (8453) üzerinde, USDC ile yapılır. Ödeme doğrulanmadan NSFW görseli servis edilmez (Bölüm 7).
