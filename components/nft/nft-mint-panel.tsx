"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Check, CheckCircle2, ExternalLink, LoaderCircle, RefreshCw,
  ShieldCheck, Sparkles, WalletCards, WandSparkles,
} from "lucide-react";
import { useAccount, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits, isAddress, maxUint256, parseEventLogs, zeroAddress } from "viem";
import { erc20ApprovalAbi, nixieGenesisAbi } from "@/lib/abi/nixie-genesis";
import { NIXIE_MAX_PER_WALLET, NIXIE_USD_PRICE, nixieName } from "@/lib/nft-collection";
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhood-chain";
import { NixieRevealShow } from "@/components/nft/nixie-reveal-show";

const NIX_ADDRESS = "0x41b24bb02b0884b3b696f1a4e7c4bc3d4a31fc8f" as const;
const NFT_ADDRESS = process.env.NEXT_PUBLIC_NIXIE_NFT_ADDRESS;

type Quote = {
  quote: { buyer: `0x${string}`; quantity: number; nixAmount: string; nonce: string; deadline: string };
  signature: `0x${string}`;
  priceUsd: string;
  liquidityUsd: number;
  expiresAt: number;
};

function displayNix(value?: string | bigint) {
  if (value === undefined) return "—";
  const raw = typeof value === "bigint" ? value : BigInt(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(formatUnits(raw, 18)));
}

function walletErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { shortMessage?: unknown; message?: unknown };
  const message = typeof candidate.shortMessage === "string" ? candidate.shortMessage : candidate.message;
  if (typeof message !== "string") return fallback;
  if (message.includes("User rejected") || message.includes("user rejected")) return "Wallet request cancelled.";
  if (message.includes("does not match the target chain") || message.includes("ChainMismatchError")) return "Switch to Robinhood Chain.";
  return message;
}

export function NftMintPanel() {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [revealedTokenIds, setRevealedTokenIds] = useState<number[]>([]);
  const [revealOpen, setRevealOpen] = useState(false);
  const [approvalHash, setApprovalHash] = useState<`0x${string}`>();
  const [approvalConfirming, setApprovalConfirming] = useState(false);
  const [walletChainId, setWalletChainId] = useState<number>();
  const [confirmedApprovalAmount, setConfirmedApprovalAmount] = useState(0n);
  const [mintHash, setMintHash] = useState<`0x${string}`>();
  const [mintConfirming, setMintConfirming] = useState(false);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: ROBINHOOD_CHAIN_ID });
  const saleAddress = NFT_ADDRESS && isAddress(NFT_ADDRESS) ? NFT_ADDRESS as `0x${string}` : undefined;
  const safeWallet = address || zeroAddress;
  const safeSaleAddress = saleAddress || zeroAddress;

  const { data: nixBalance, refetch: refetchBalance } = useReadContract({
    address: NIX_ADDRESS, abi: erc20ApprovalAbi, functionName: "balanceOf", args: [safeWallet],
    query: { enabled: Boolean(address) },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: NIX_ADDRESS, abi: erc20ApprovalAbi, functionName: "allowance", args: [safeWallet, safeSaleAddress],
    query: { enabled: Boolean(address && saleAddress) },
  });
  const { data: walletMinted, refetch: refetchWalletMinted } = useReadContract({
    address: safeSaleAddress, abi: nixieGenesisAbi, functionName: "mintedByWallet", args: [safeWallet],
    query: { enabled: Boolean(address && saleAddress) },
  });
  const { data: remainingSupply, refetch: refetchSupply } = useReadContract({
    address: safeSaleAddress, abi: nixieGenesisAbi, functionName: "remainingSupply", query: { enabled: Boolean(saleAddress) },
  });
  const { data: saleActive } = useReadContract({
    address: safeSaleAddress, abi: nixieGenesisAbi, functionName: "saleActive", query: { enabled: Boolean(saleAddress) },
  });

  const minted = Number(walletMinted || 0n);
  const remainingWalletMints = Math.max(0, NIXIE_MAX_PER_WALLET - minted);
  const effectiveQuantity = Math.min(quantity, Math.max(1, remainingWalletMints));
  const quotedAmount = quote ? BigInt(quote.quote.nixAmount) : 0n;
  const onchainAllowance = allowance || 0n;
  const effectiveAllowance = onchainAllowance > confirmedApprovalAmount ? onchainAllowance : confirmedApprovalAmount;
  const needsApproval = effectiveAllowance < quotedAmount;
  const insufficientBalance = typeof nixBalance === "bigint" && nixBalance < quotedAmount;
  const quoteSeconds = quote ? Math.max(0, Math.ceil((quote.expiresAt - now) / 1000)) : 0;
  const quoteExpired = !quote || quoteSeconds === 0;
  const activeChainId = walletChainId ?? chainId;
  const wrongNetwork = isConnected && activeChainId !== ROBINHOOD_CHAIN_ID;
  const mintedSupply = 1000 - Number(remainingSupply ?? 1000n);
  const progress = Math.min(100, Math.max(0, mintedSupply / 10));
  const explorer = mintHash ? `https://robinhoodchain.blockscout.com/tx/${mintHash}` : null;

  const loadQuote = useCallback(async () => {
    if (!address || !saleAddress || remainingWalletMints === 0 || wrongNetwork) return;
    setQuoteError(null);
    try {
      const response = await fetch("/api/nft/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, quantity: effectiveQuantity }), cache: "no-store",
      });
      const payload = await response.json() as Quote & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error || "Live quote unavailable");
      setQuote(payload);
    } catch (error) {
      setQuote(null);
      setQuoteError(error instanceof Error ? error.message : "Live quote unavailable");
    }
  }, [address, effectiveQuantity, remainingWalletMints, saleAddress, wrongNetwork]);

  useEffect(() => { void loadQuote(); }, [loadQuote]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    let active = true;
    const syncWalletChain = async () => {
      if (!connector || !isConnected) {
        if (active) setWalletChainId(undefined);
        return;
      }
      try {
        const actualChainId = await connector.getChainId();
        if (active) setWalletChainId(actualChainId);
      } catch {
        // The regular wagmi chain state remains as a safe fallback.
      }
    };
    void syncWalletChain();
    const id = window.setInterval(() => void syncWalletChain(), 1_500);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [connector, isConnected]);
  useEffect(() => {
    setConfirmedApprovalAmount(0n);
    setApprovalConfirming(false);
    setApprovalHash(undefined);
  }, [address]);
  const ensureRobinhoodChain = async () => {
    const actualChainId = await connector?.getChainId();
    if (actualChainId !== ROBINHOOD_CHAIN_ID) {
      await switchChainAsync({ chainId: ROBINHOOD_CHAIN_ID });
    }
    const confirmedChainId = await connector?.getChainId();
    setWalletChainId(confirmedChainId);
    if (confirmedChainId !== ROBINHOOD_CHAIN_ID) throw new Error("Switch to Robinhood Chain.");
  };

  const approve = async () => {
    if (!address || !publicClient || !saleAddress || !quote) return;
    setNotice(null);
    try {
      await ensureRobinhoodChain();
      await publicClient.simulateContract({
        account: address,
        address: NIX_ADDRESS,
        abi: erc20ApprovalAbi,
        functionName: "approve",
        args: [saleAddress, maxUint256],
      });
      const hash = await writeContractAsync({
        account: address,
        chainId: ROBINHOOD_CHAIN_ID,
        address: NIX_ADDRESS,
        abi: erc20ApprovalAbi,
        functionName: "approve",
        args: [saleAddress, maxUint256],
      });
      setApprovalHash(hash);
      setApprovalConfirming(true);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("Approval transaction failed.");
      const result = await refetchAllowance();
      const approvedAmount = result.data || maxUint256;
      setConfirmedApprovalAmount(approvedAmount);
      setApprovalConfirming(false);
      setNotice(null);
      if (!quote || quote.expiresAt <= Date.now() + 10_000) await loadQuote();
    } catch (error) {
      setApprovalConfirming(false);
      setApprovalHash(undefined);
      setNotice(walletErrorMessage(error, "Approval failed. Please try again."));
    }
  };

  const mint = async () => {
    if (!address || !publicClient || !saleAddress || !quote || quote.expiresAt <= Date.now() || needsApproval) { await loadQuote(); return; }
    setNotice(null);
    setRevealedTokenIds([]);
    try {
      await ensureRobinhoodChain();
      const hash = await writeContractAsync({
        account: address,
        chainId: ROBINHOOD_CHAIN_ID,
        address: saleAddress, abi: nixieGenesisAbi, functionName: "mint",
        args: [{ buyer: quote.quote.buyer, quantity: BigInt(quote.quote.quantity), nixAmount: quotedAmount, nonce: BigInt(quote.quote.nonce), deadline: BigInt(quote.quote.deadline) }, quote.signature],
      });
      setMintHash(hash);
      setNotice("Someone irresistible is answering your call…");
      setMintConfirming(true);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("Mint transaction failed.");
      const events = parseEventLogs({ abi: nixieGenesisAbi, logs: receipt.logs, eventName: "MintRevealed", strict: true });
      const tokenIds = events.map((event) => Number(event.args.tokenId)).filter((tokenId) => tokenId >= 1 && tokenId <= 20);
      if (tokenIds.length === 0) throw new Error("Mint confirmed, but the reveal could not be displayed. Open the transaction to view it.");
      setRevealedTokenIds(tokenIds);
      setRevealOpen(true);
      window.localStorage.setItem(`nixie-last-reveal:${address.toLowerCase()}`, JSON.stringify({ tokenIds, transactionHash: hash }));
      setConfirmedApprovalAmount(0n);
      setApprovalConfirming(false);
      setApprovalHash(undefined);
      setNotice("Reveal complete. Your Nixie is waiting inside her private room.");
      void Promise.all([refetchWalletMinted(), refetchSupply(), refetchAllowance(), refetchBalance()]);
    } catch (error) {
      setNotice(walletErrorMessage(error, "Mint was not completed."));
    } finally {
      setMintConfirming(false);
    }
  };

  const button = (() => {
    if (!saleAddress) return { label: "Sale contract not configured", action: undefined, disabled: true, icon: AlertTriangle };
    if (!isConnected) return { label: "Connect wallet", action: () => openConnectModal?.(), disabled: false, icon: WalletCards };
    if (wrongNetwork) return { label: "Switch to Robinhood Chain", action: ensureRobinhoodChain, disabled: isSwitching, icon: RefreshCw };
    if (remainingWalletMints === 0) return { label: "Your three fantasies are yours", action: undefined, disabled: true, icon: CheckCircle2 };
    if (saleActive === false) return { label: "The velvet door opens shortly", action: undefined, disabled: true, icon: Sparkles };
    if (approvalConfirming) return { label: "Confirming on Robinhood…", action: undefined, disabled: true, icon: LoaderCircle };
    if (mintConfirming) return { label: "Opening the portal…", action: undefined, disabled: true, icon: LoaderCircle };
    if (quoteError || !quote || quoteExpired) return { label: "Get fresh NIX price", action: loadQuote, disabled: false, icon: RefreshCw };
    if (insufficientBalance) return { label: "Not enough NIX", action: undefined, disabled: true, icon: AlertTriangle };
    if (needsApproval) return { label: "Enable NIX", action: approve, disabled: isPending, icon: ShieldCheck };
    return { label: `Reveal ${effectiveQuantity} ${effectiveQuantity === 1 ? "Nixie" : "Nixies"}`, action: mint, disabled: isPending, icon: WandSparkles };
  })();

  const ButtonIcon = button.icon;

  return (
    <>
    <aside id="mint" className="relative overflow-hidden rounded-[2rem] border border-lime-300/25 bg-[#0d0b13]/90 shadow-[0_30px_100px_rgba(0,0,0,.6)] backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d7ff00] to-transparent" />
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#d7ff00]/10 blur-3xl" />
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-[#d7ff00]">After-dark summoning</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">Choose your temptation.</h2></div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${saleActive ? "border-[#d7ff00]/30 bg-[#d7ff00]/10 text-[#d7ff00]" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}><span className={`h-1.5 w-1.5 rounded-full ${saleActive ? "animate-pulse bg-[#d7ff00]" : "bg-amber-200"}`} />{saleActive ? "Mint live" : "Stand by"}</div>
        </div>

        <div className="mt-6">
          <div className="flex items-end justify-between text-xs"><span className="text-white/45">Desires awakened</span><span className="font-black text-white">{mintedSupply.toLocaleString()} <span className="text-white/30">/ 1,000</span></span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#d7ff00] via-[#a6ff7d] to-[#d977ff] shadow-[0_0_18px_#d7ff00] transition-all duration-700" style={{ width: `${Math.max(progress, 0.6)}%` }} /></div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((amount) => (
            <button key={amount} type="button" disabled={amount > remainingWalletMints} onClick={() => setQuantity(amount)} className={`group relative overflow-hidden rounded-2xl border px-2 py-4 text-center ${effectiveQuantity === amount ? "border-[#d7ff00] bg-[#d7ff00] text-black shadow-[0_0_28px_rgba(215,255,0,.2)]" : "border-white/10 bg-white/[.035] text-white hover:border-white/25"} disabled:cursor-not-allowed disabled:opacity-25`}>
              <span className="block text-2xl font-black">{amount}</span><span className="mt-1 block text-[9px] font-black uppercase tracking-[.18em] opacity-60">{amount === 1 ? "Nixie" : "Nixies"}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-white/45">Live total</span><span className="text-xl font-black text-[#d7ff00]">{quote ? `${displayNix(quotedAmount)} NIX` : "—"}</span></div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-white/35"><span>Always ${(effectiveQuantity * NIXIE_USD_PRICE).toFixed(2)} USD</span><span>{quote ? `$${quote.priceUsd} / NIX` : "Fetching market…"}</span></div>
          {isConnected && <div className="mt-3 flex items-center justify-between border-t border-white/[.06] pt-3 text-[10px]"><span className="text-white/35">Your wallet</span><span className="font-bold text-white/60">{displayNix(nixBalance)} NIX · {remainingWalletMints}/3 mints left</span></div>}
        </div>

        {quote && saleActive && <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2 text-[10px]"><span className="text-white/35">Signed quote expires</span><span className={`font-black ${quoteSeconds <= 15 ? "text-amber-300" : "text-white/65"}`}>{quoteSeconds}s</span></div>}
        {quoteError && <p className="mt-3 flex gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{quoteError}</p>}
        {notice && <p className="mt-3 flex gap-2 rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs leading-5 text-white/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d7ff00]" />{notice}</p>}

        {revealedTokenIds.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#d7ff00]/30 bg-[#d7ff00]/[.05] p-3">
            <div className="mb-3 flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#d7ff00]"><Sparkles className="h-3.5 w-3.5" />Portal reveal</p><button type="button" onClick={() => setRevealOpen(true)} className="rounded-full border border-[#d7ff00]/25 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-[#d7ff00] hover:bg-[#d7ff00] hover:text-black">Replay reveal</button></div>
            <div className={`grid gap-2 ${revealedTokenIds.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {revealedTokenIds.map((tokenId, index) => <div key={`${tokenId}-${index}`} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"><Image src={`/nft/genesis/${String(tokenId).padStart(2, "0")}.jpg`} alt={nixieName(tokenId)} fill sizes="240px" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 pt-10"><p className="text-xs font-black text-white">{nixieName(tokenId)}</p><p className="mt-0.5 text-[9px] font-bold text-[#d7ff00]">GENESIS #{String(tokenId).padStart(2, "0")}</p></div></div>)}
            </div>
          </div>
        )}

        <button type="button" disabled={button.disabled} onClick={button.action} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d7ff00] px-5 py-4 text-sm font-black text-[#0a090d] shadow-[0_14px_40px_rgba(215,255,0,.14)] hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45">
          {(isPending || isSwitching || approvalConfirming || mintConfirming) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ButtonIcon className="h-4 w-4" />}{button.label}
        </button>
        {explorer && <a href={explorer} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-[#d7ff00] hover:underline">View transaction <ExternalLink className="h-3 w-3" /></a>}
        <div className="mt-5 flex items-center justify-center gap-4 text-[9px] font-bold uppercase tracking-wider text-white/25"><span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Verified contract</span><span>·</span><span>Instant reveal</span><span>·</span><span>Max 3</span></div>
      </div>
    </aside>
    <NixieRevealShow open={revealOpen} tokenIds={revealedTokenIds} transactionHash={mintHash} onClose={() => setRevealOpen(false)} />
    </>
  );
}
