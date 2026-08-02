#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
KEYTOOL="$JAVA_HOME/bin/keytool"
KEYSTORE_PATH="$PROJECT_DIR/play-store/signing/panicpass-upload.jks"
KEYCHAIN_SERVICE="com.guwopabdurrahman31ui.panicpasssos.upload-key"
KEYCHAIN_ACCOUNT="${USER:?USER is required}"

mkdir -p "$PROJECT_DIR/play-store/signing"

if [[ -f "$KEYSTORE_PATH" ]]; then
  echo "Upload key already exists: $KEYSTORE_PATH"
  exit 0
fi

SIGNING_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
security add-generic-password \
  -a "$KEYCHAIN_ACCOUNT" \
  -s "$KEYCHAIN_SERVICE" \
  -w "$SIGNING_SECRET" \
  -U >/dev/null

"$KEYTOOL" -genkeypair -v \
  -keystore "$KEYSTORE_PATH" \
  -storetype PKCS12 \
  -alias upload \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=Panic Pass SOS, OU=Android, O=Panic Pass SOS, L=Seoul, ST=Seoul, C=KR" \
  -storepass "$SIGNING_SECRET" \
  -keypass "$SIGNING_SECRET" >/dev/null

chmod 600 "$KEYSTORE_PATH"
unset SIGNING_SECRET

echo "Created the upload key and saved its password in macOS Keychain."
