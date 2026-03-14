/**
 * Bridge: wallet adapter (signTransaction) → @solana/kit TransactionPartialSigner for @x402/svm.
 * Builds wire-format transaction from kit Transaction, signs via wallet, returns SignatureDictionary.
 */

import type { Transaction } from "@solana/transactions";
import type { Address } from "@solana/addresses";
import type { SignatureBytes } from "@solana/keys";
import type { TransactionPartialSigner } from "@solana/signers";
import type { SignerWalletAdapterProps } from "@solana/wallet-adapter-base";
import { VersionedTransaction } from "@solana/web3.js";

/** Build a TransactionPartialSigner that delegates to the wallet adapter's signTransaction. */
export function createWalletAdapterSolanaSigner(
  address: Address,
  signTransaction: SignerWalletAdapterProps["signTransaction"]
): TransactionPartialSigner {
  if (!signTransaction) {
    throw new Error("Wallet does not support signTransaction");
  }
  return {
    address,
    async signTransactions(transactions: readonly Transaction[]): Promise<readonly Record<Address, SignatureBytes>[]> {
      const out: Record<Address, SignatureBytes>[] = [];
      for (const tx of transactions) {
        const messageBytes = new Uint8Array(tx.messageBytes);
        const sigMap = tx.signatures;
        const numSigs = Object.keys(sigMap).length;
        // Solana wire: compact-u16(numSigs) + 64*numSigs bytes + messageBytes
        const compact = numSigs < 128 ? new Uint8Array([numSigs]) : new Uint8Array([0x80 | (numSigs & 0x7f), numSigs >> 7]);
        const wire = new Uint8Array(compact.length + 64 * numSigs + messageBytes.length);
        wire.set(compact, 0);
        wire.set(messageBytes, compact.length + 64 * numSigs);
        const versionedTx = VersionedTransaction.deserialize(wire);
        const signedTx = await signTransaction(versionedTx as Parameters<typeof signTransaction>[0]);
        const signed = signedTx as VersionedTransaction;
        const sigs = signed.signatures;
        // Signatures align with signer account order; first signer is usually fee payer (CDP). Find our index.
        const signerPubkeys = signed.message.staticAccountKeys.slice(
          0,
          signed.message.header.numRequiredSignatures
        );
        const addressStr = typeof address === "string" ? address : (address as { toString(): string }).toString();
        const signerIndex = signerPubkeys.findIndex((pk) => pk.toBase58() === addressStr);
        if (signerIndex < 0) throw new Error("Wallet address is not a signer on this transaction");
        const mySig = sigs[signerIndex];
        if (!mySig || mySig.length !== 64) throw new Error("Invalid signature from wallet");
        out.push({ [address]: mySig as SignatureBytes });
      }
      return out;
    },
  };
}
