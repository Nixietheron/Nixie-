#!/usr/bin/env bash
set -euo pipefail

RPC_URL="https://rpc.mainnet.chain.robinhood.com"
CONTRACT="0xd092B7e9FC3e2684b59B83212394d293E6a89550"
FINAL_URI="ipfs://QmfGCckYg5EYoi71iLE5PpQHXqJvYa6berMauYSGvmxByY"
KEYSTORE="${HOME}/.foundry/keystores/nixie-genesis-deployer/nixie-deployer-v2"
EXPECTED_OWNER="0x9b67F3835826192852D16373fE18Cef20381fb19"

if [[ ! -f "$KEYSTORE" ]]; then
  echo "Nixie deployer keystore was not found."
  exit 1
fi

PASSWORD_FILE="$(mktemp)"
trap 'rm -f "$PASSWORD_FILE"' EXIT
chmod 600 "$PASSWORD_FILE"
if [[ "${NIXIE_USE_KEYCHAIN:-0}" == "1" ]] && command -v security >/dev/null 2>&1; then
  KEYSTORE_PASSWORD="$(security find-generic-password -s "nixie-genesis-deployer-keystore" -w)"
elif [[ "${NIXIE_GUI_PROMPTS:-0}" == "1" ]] && command -v osascript >/dev/null 2>&1; then
  KEYSTORE_PASSWORD="$(osascript -e 'text returned of (display dialog "Enter the encrypted Nixie deployer keystore password. It will stay local and will not be printed." default answer "" with title "Nixie deployer" with hidden answer buttons {"Cancel", "Continue"} default button "Continue" cancel button "Cancel")')"
else
  read -r -s -p "Deployer keystore password: " KEYSTORE_PASSWORD
  echo
fi
printf '%s' "$KEYSTORE_PASSWORD" > "$PASSWORD_FILE"
unset KEYSTORE_PASSWORD

SIGNER="$(cast wallet address --keystore "$KEYSTORE" --password-file "$PASSWORD_FILE")"
SIGNER_NORMALIZED="$(printf '%s' "$SIGNER" | tr '[:upper:]' '[:lower:]')"
EXPECTED_OWNER_NORMALIZED="$(printf '%s' "$EXPECTED_OWNER" | tr '[:upper:]' '[:lower:]')"
if [[ "$SIGNER_NORMALIZED" != "$EXPECTED_OWNER_NORMALIZED" ]]; then
  echo "The selected keystore is not the on-chain owner."
  exit 1
fi

ACTIVE_URI="$(cast call "$CONTRACT" "contractURI()(string)" --rpc-url "$RPC_URL")"
ACTIVE_URI="${ACTIVE_URI#\"}"
ACTIVE_URI="${ACTIVE_URI%\"}"
if [[ "$ACTIVE_URI" != "$FINAL_URI" ]]; then
  echo "Updating collection metadata URI..."
  cast send "$CONTRACT" "setContractURI(string)" "$FINAL_URI" \
    --rpc-url "$RPC_URL" \
    --keystore "$KEYSTORE" \
    --password-file "$PASSWORD_FILE"

  ACTIVE_URI="$(cast call "$CONTRACT" "contractURI()(string)" --rpc-url "$RPC_URL")"
  ACTIVE_URI="${ACTIVE_URI#\"}"
  ACTIVE_URI="${ACTIVE_URI%\"}"
else
  echo "Collection URI is already active on-chain."
fi
if [[ "$ACTIVE_URI" != "$FINAL_URI" ]]; then
  echo "On-chain collection URI verification failed. Metadata was not frozen."
  exit 1
fi
echo "Collection URI verified: $ACTIVE_URI"

if [[ "${NIXIE_AUTO_FREEZE:-0}" == "1" ]]; then
  CONFIRM="FREEZE"
elif [[ "${NIXIE_GUI_PROMPTS:-0}" == "1" ]] && command -v osascript >/dev/null 2>&1; then
  CONFIRM="$(osascript -e 'button returned of (display dialog "The final collection URI is now active on-chain. Permanently freeze all 20 token metadata URIs? This cannot be undone." with title "Freeze Nixie metadata" buttons {"Keep editable", "FREEZE"} default button "Keep editable")')"
else
  read -r -p "After checking OpenSea, type FREEZE to permanently freeze all 20 token URIs: " CONFIRM
fi
if [[ "$CONFIRM" != "FREEZE" ]]; then
  echo "Token metadata remains editable. Run this script again after OpenSea verification."
  exit 0
fi

cast send "$CONTRACT" "freezeTokenMetadata()" \
  --rpc-url "$RPC_URL" \
  --keystore "$KEYSTORE" \
  --password-file "$PASSWORD_FILE"

FROZEN="$(cast call "$CONTRACT" "tokenMetadataFrozen()(bool)" --rpc-url "$RPC_URL")"
if [[ "$FROZEN" != "true" ]]; then
  echo "Freeze transaction did not verify successfully."
  exit 1
fi
echo "Token metadata is permanently frozen."
