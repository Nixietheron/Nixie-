Migrate to a Standard Web App

Copy page

Migrate your Farcaster mini app to work in the Base App. Covers replacing deprecated SDK methods, and registering on Base.dev.

After April 9, 2026, the Base App treats all apps as standard web apps regardless of Farcaster manifests. Use the migration paths below to get your app working correctly in the Base App.
Using an AI coding agent? Install the Migration Skill to let your agent handle this migration automatically. Run npx skills add base/skills and ask your agent to migrate your Farcaster mini app to a standard web app.
​
What’s changing
The Base App is moving from the Farcaster mini-app spec to a single model: standard web app + wallet, powered by Base.dev.
Before	After
Farcaster manifest (/.well-known/farcaster.json)	App metadata on Base.dev projects. Already registered apps do not need to update metadata.
Neynar webhooks for add/remove events	Base-owned backends (Base Account / address preferences)
FID-based notifications via Neynar	Wallet-address notifications via Base.dev notifications API (coming soon)
Farcaster SDK for auth and actions	wagmi + viem + Sign-In with Ethereum (SIWE)
Search and discovery via Farcaster	Base.dev app metadata + builder codes
​
Choose your migration path
I'm converting a mini app
My app has no Farcaster SDK
Let your agent handle this. Install the Migration Skill with npx skills add base/skills and ask your agent to migrate your Farcaster mini app to a standard web app. The skill maps deprecated SDK methods, replaces auth and wallet logic, and wires up the Base App path automatically.
Your app uses the Farcaster SDK. The migration replaces Farcaster-specific auth, identity, and actions with standard web equivalents.
1
Add the standard web stack

Install wagmi, viem, and React Query if you don’t have them already:
Terminal
npm install wagmi viem @tanstack/react-query @base-org/account
Create a wagmi config for Base and wrap your app with WagmiProvider and QueryClientProvider:
config.ts
import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    baseAccount({
      appName: 'My App',
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
See all 24 lines
App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from './config';

const queryClient = new QueryClient();

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
This replaces the Farcaster frame connector with standard wagmi providers that work in the Base app’s in-app browser.
2
Replace auth and identity

Farcaster sign-in and FID-based identity are not available in the Base App. Replace them with SIWE for authentication and the connected wallet address for user identity.
Build, sign, and verify the SIWE message:
SignIn.tsx
'use client';

import { useState } from 'react';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import { useAccount, usePublicClient, useSignMessage } from 'wagmi';

export function SignIn() {
  const { address, chainId, isConnected } = useAccount();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  async function handleSignIn() {
    if (!isConnected || !address || !chainId || !publicClient) {
      throw new Error('Connect your wallet before signing in');
    }

    setIsSigningIn(true);
    const nonce = generateSiweNonce();

    try {
      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: '1',
      });

      const signature = await signMessageAsync({ message });

      const valid = await publicClient.verifySiweMessage({ message, signature });
      if (!valid) throw new Error('SIWE verification failed');
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={!isConnected || isSigningIn}
    >
      {isSigningIn ? 'Signing in...' : 'Sign in with Ethereum'}
    </button>
  );
}
See all 49 lines
This example verifies the signature client-side. If your app needs server-side sessions or replay protection, see the Authenticate users guide for the full pattern with server-issued nonces, backend verification.
Use useAccount from wagmi to read the connected wallet address as the user’s identity and guard SIWE execution until the wallet and chain are available.
3
Review SDK method compatibility

See the compatibility table for what will and won’t work in the Base app, along with standard web alternatives.
4
Migrate notifications to Base.dev

Notifications migration will be available in Base.dev soon.
Farcaster-based notifications (via Neynar, FIDs, or tokens) will not reach Base App users. Replace them with the Base.dev notifications API, which sends by wallet address.
5
Register on Base.dev

If you haven’t registered yet, create a project at Base.dev and complete your app metadata: name, icon, tagline, description, screenshots, category, primary URL, and builder code. Already registered apps do not need to re-register or update metadata.
​
Deprecated Farcaster SDK methods in the Base App
The following Farcaster mini-app SDK methods are not invoked by the Base App after April 9, 2026. Migrate to the alternatives listed.
SDK method	Alternative in the Base App
signIn	Sign-In with Ethereum using wagmi (useSignMessage)
sendToken	Standard ERC-20 transfer with wagmi (useWriteContract)
openUrl	window.open(url)
openMiniApp	window.open(url)
viewToken	Deeplink: https://base.app/coin/base-mainnet/TOKEN_ADDRESS
viewProfile	Deeplink: https://base.app/profile/WALLET_ADDRESS
swapToken	Construct swap transactions with wagmi, viem, or your preferred onchain library.
requestCameraAndMicrophoneAccess	No replacement
close	No replacement
addMiniApp	the Base App handles mini app installation automatically. No SDK needed.
viewCast	Not needed in the Base App
composeCast	Not needed in the Base App
ready	Not needed. Your app is ready to display when it loads.
User context and FID	Read the injected wallet address via wagmi (useAccount)
​
Pre-flight checklist
Before considering your app migrated, verify the following:
1
Farcaster SDK is removed

All Farcaster SDK packages are uninstalled and all SDK imports and FID-based UI are removed from the codebase.
2
Wallet and auth use wagmi + viem

Wallet connection and contract interactions use wagmi + viem. Authentication uses SIWE where needed.
3
Register and complete Base.dev metadata

Project is registered on Base.dev with primary URL set. Name, icon, tagline, screenshots, category, description, and builder code are all filled in.
4
Notifications use Base.dev API (if applicable)

Notifications migration will be available in Base.dev soon.
Notifications are sent via the Base.dev notifications API by wallet address — not via Neynar, FIDs, or tokens.
If all steps above are complete, your app is ready for the Base App as a standard web app.