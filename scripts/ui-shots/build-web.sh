#!/usr/bin/env bash
# Builds the web bundle used for screenshots: scripts/ui-shots/build-web.sh <outDir>
#   default = mock API (EXPO_PUBLIC_MOCK_API=true); MOCK=false API_BASE=/api builds against a real backend.
# expo-secure-store has no web implementation, so login cannot succeed on web as shipped. For this
# build only, node_modules/expo-secure-store's web stub gets a localStorage shim, restored on exit.
set -euo pipefail
out="${1:?usage: build-web.sh <outDir>}"
root="$(cd "$(dirname "$0")/../.." && pwd)"
stub="$root/node_modules/expo-secure-store/build/ExpoSecureStore.web.js"
cp "$stub" "$stub.bak"
trap 'mv "$stub.bak" "$stub"' EXIT
cat > "$stub" <<'JS'
const ls = globalThis.localStorage;
export default {
  getValueWithKeyAsync: async (k) => ls.getItem("ss:" + k),
  setValueWithKeyAsync: async (v, k) => { ls.setItem("ss:" + k, v); },
  deleteValueWithKeyAsync: async (k) => { ls.removeItem("ss:" + k); },
  canUseBiometricAuthentication: () => false,
};
JS
cd "$root"
env EXPO_PUBLIC_MOCK_API="${MOCK:-true}" EXPO_PUBLIC_API_BASE_URL="${API_BASE:-http://localhost:8080/api}" npx expo export --platform web --output-dir "$out" --clear
