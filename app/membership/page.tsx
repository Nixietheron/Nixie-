"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Crown, Shield, Sparkles, Clock3, ArrowLeft } from "lucide-react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { useWalletClientWithErc8021 } from "@/lib/wallet-client-erc8021";
import { useWallet } from "@solana/wallet-adapter-react";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactEvmSchemeV1 } from "@x402/evm/exact/v1/client";
import { ExactSvmSchemeV1 } from "@x402/svm/exact/v1/client";
import { address as toSolanaAddress } from "@solana/addresses";
import { createWalletAdapterSolanaSigner } from "@/lib/solana-x402-signer";
import {
  BASE_CHAIN_ID,
  MEMBERSHIP_DURATION_DAYS,
  MEMBERSHIP_PRICE_USDC,
  SOLANA_MAINNET_CAIP2,
  SOLANA_RPC,
  X402_CHAIN_IDS,
} from "@/lib/constants";
import { ConnectButton } from "@/components/connect-button";

const HERO_IMAGES = [
  "/Nixie1.png",
  "/Nixie2.png",
  "/Nixie3.png",
  "/Nixie4.png",
  "/Nixie5.png",
] as const;

type MembershipStatus = {
  active: boolean;
  wallet: string | null;
  endsAt: string | null;
  daysLeft: number;
};

export default function MembershipPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClientWithErc8021();
  const publicClient = usePublicClient();
  const solanaWallet = useWallet();

  const [status, setStatus] = useState<MembershipStatus>({
    active: false,
    wallet: null,
    endsAt: null,
    daysLeft: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);

  const walletConnectKey = `${address ?? ""}|${solanaWallet.publicKey?.toBase58() ?? ""}`;

  useEffect(() => {
    const bump = () => setSessionNonce((n) => n + 1);
    window.addEventListener("nixie-wallet-session", bump);
    return () => window.removeEventListener("nixie-wallet-session", bump);
  }, []);

  const fetchWithPayment = useMemo(() => {
    if (!X402_CHAIN_IDS.includes(chainId as (typeof X402_CHAIN_IDS)[number])) return null;
    if (!walletClient?.account || !publicClient) return null;
    const signer = {
      address: walletClient.account.address,
      signTypedData: walletClient.signTypedData.bind(walletClient),
      readContract: publicClient.readContract.bind(publicClient),
    };
    const client = new x402Client();
    client.register("eip155:*", new ExactEvmScheme(signer));
    client.registerV1("base", new ExactEvmSchemeV1(signer));
    return wrapFetchWithPayment(fetch, client);
  }, [chainId, walletClient, publicClient]);

  const fetchWithPaymentSolana = useMemo(() => {
    if (!solanaWallet.publicKey || !solanaWallet.signTransaction) return null;
    try {
      const solanaAddress = toSolanaAddress(solanaWallet.publicKey.toBase58());
      const signer = createWalletAdapterSolanaSigner(solanaAddress, solanaWallet.signTransaction);
      const svmScheme = new ExactSvmSchemeV1(signer, { rpcUrl: SOLANA_RPC });
      const client = new x402Client();
      client.registerV1("solana", svmScheme);
      client.registerV1(SOLANA_MAINNET_CAIP2, svmScheme);
      return wrapFetchWithPayment(fetch, client);
    } catch {
      return null;
    }
  }, [solanaWallet.publicKey, solanaWallet.signTransaction]);

  const refreshStatus = async () => {
    const res = await fetch("/api/membership/status", { cache: "no-store", credentials: "include" });
    const data = await res.json();
    setStatus({
      active: Boolean(data.active),
      wallet: typeof data.wallet === "string" ? data.wallet : null,
      endsAt: typeof data.endsAt === "string" ? data.endsAt : null,
      daysLeft: Number(data.daysLeft ?? 0),
    });
  };

  useEffect(() => {
    refreshStatus().catch(() => {
      // ignore, user can retry
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnectKey, sessionNonce]);

  const handleSubscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      if (address && fetchWithPayment) {
        const res = await fetchWithPayment("/api/membership/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Payment failed");
      } else if (solanaWallet.connected && solanaWallet.publicKey && fetchWithPaymentSolana) {
        const res = await fetchWithPaymentSolana("/api/membership/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: solanaWallet.publicKey.toBase58() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Payment failed");
      } else {
        throw new Error("Connect Base or Solana wallet first.");
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      {/* Background: same panel style as landing */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 flex gap-[2px]">
          {HERO_IMAGES.map((src) => (
            <div
              key={src}
              className="relative flex-1 bg-cover bg-center"
              style={{ backgroundImage: `url(${src})` }}
            >
              <div className="absolute inset-0 bg-[#0a080c]/65" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a080c]/85 via-[#0a080c]/75 to-[#0a080c]/90" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Link href="/feed" className="inline-flex items-center gap-2 text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
          <span className="text-white/40 text-xs tracking-[0.2em] uppercase">Membership</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[#D27A92]/30 bg-[#14101a]/90 p-6 sm:p-8 mb-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D27A92]/20 border border-[#D27A92]/40 text-[#f3c2cf] text-xs mb-3">
                <Crown className="w-3.5 h-3.5" />
                Nixie Membership
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ${MEMBERSHIP_PRICE_USDC} USDC / {MEMBERSHIP_DURATION_DAYS} days
              </h1>
              <p className="text-white/60 mt-2 max-w-xl text-sm sm:text-base">
                Unlock all premium content instantly while your membership is active. When it ends, you can renew or continue with single unlock purchases.
              </p>
            </div>
            <div className="min-w-[240px] w-full sm:w-auto">
              {status.active ? (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <p className="text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Membership Active
                  </p>
                  <p className="text-emerald-200/90 text-sm mt-1">
                    {status.daysLeft} day{status.daysLeft === 1 ? "" : "s"} left
                  </p>
                  {status.endsAt && (
                    <p className="text-emerald-200/70 text-xs mt-1">
                      Ends: {new Date(status.endsAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl font-semibold bg-gradient-to-r from-[#D27A92] to-[#c96b84] disabled:opacity-60"
                >
                  {loading ? "Processing..." : `Subscribe ${MEMBERSHIP_PRICE_USDC} USDC`}
                </button>
              )}
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Sparkles className="w-5 h-5 text-[#D27A92] mb-2" />
            <p className="font-semibold">All Locked Content</p>
            <p className="text-white/55 text-sm mt-1">NSFW + Animated access during active membership.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Clock3 className="w-5 h-5 text-[#D27A92] mb-2" />
            <p className="font-semibold">30-Day Window</p>
            <p className="text-white/55 text-sm mt-1">Auto-expire model: renew anytime with one payment.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Shield className="w-5 h-5 text-[#D27A92] mb-2" />
            <p className="font-semibold">x402 + Onchain</p>
            <p className="text-white/55 text-sm mt-1">Payment proof verified server-side before access is granted.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111019] p-5 mb-6">
          <p className="font-semibold mb-3">How it works</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li>1) Connect Base or Solana wallet</li>
            <li>2) Pay {MEMBERSHIP_PRICE_USDC} USDC once</li>
            <li>3) Access all locked content for {MEMBERSHIP_DURATION_DAYS} days</li>
            <li>4) When expired: renew membership or continue with single unlocks</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111019] p-5">
          <p className="font-semibold mb-3">Wallet</p>
          <p className="text-white/60 text-sm mb-3">Use your preferred wallet to subscribe.</p>
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
