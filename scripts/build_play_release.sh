#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
KEYSTORE_PATH="$PROJECT_DIR/play-store/signing/panicpass-upload.jks"
KEYCHAIN_SERVICE="com.guwopabdurrahman31ui.panicpasssos.upload-key"
KEYCHAIN_ACCOUNT="${USER:?USER is required}"
BUILD_TMP="$(mktemp -d /tmp/panicpass-build.XXXXXX)"

cleanup() {
  case "$BUILD_TMP" in
    /tmp/panicpass-build.*) find "$BUILD_TMP" -depth -delete 2>/dev/null || true ;;
  esac
}
trap cleanup EXIT

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "Android Studio Java runtime was not found: $JAVA_HOME" >&2
  exit 1
fi

if [[ ! -f "$KEYSTORE_PATH" ]]; then
  "$PROJECT_DIR/scripts/create_upload_key.sh"
fi

SIGNING_SECRET="$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w)"

rsync -a \
  --exclude '.git/' \
  --exclude '.gradle/' \
  --exclude 'build/' \
  --exclude 'app/build/' \
  --exclude 'play-store/signing/' \
  --exclude '._*' \
  "$PROJECT_DIR/" "$BUILD_TMP/source/"

export JAVA_HOME ANDROID_HOME
export PANIC_PASS_KEYSTORE="$KEYSTORE_PATH"
export PANIC_PASS_STORE_PASSWORD="$SIGNING_SECRET"
export PANIC_PASS_KEY_ALIAS="upload"

"$BUILD_TMP/source/gradlew" -p "$BUILD_TMP/source" lintRelease bundleRelease assembleRelease

RELEASE_DIR="$PROJECT_DIR/play-store/release"
mkdir -p "$RELEASE_DIR"
cp "$BUILD_TMP/source/app/build/outputs/bundle/release/app-release.aab" \
  "$RELEASE_DIR/panic-pass-sos-v1.0.0.aab"
cp "$BUILD_TMP/source/app/build/outputs/apk/release/app-release.apk" \
  "$RELEASE_DIR/panic-pass-sos-v1.0.0.apk"

"$JAVA_HOME/bin/keytool" -exportcert -rfc \
  -keystore "$KEYSTORE_PATH" \
  -storepass "$SIGNING_SECRET" \
  -alias upload \
  -file "$RELEASE_DIR/upload_certificate.pem" >/dev/null

# keytool writes CRLF on some systems; normalize the public certificate for Git.
perl -pi -e 's/\r$//' "$RELEASE_DIR/upload_certificate.pem"

shasum -a 256 \
  "$RELEASE_DIR/panic-pass-sos-v1.0.0.aab" \
  "$RELEASE_DIR/panic-pass-sos-v1.0.0.apk" \
  > "$RELEASE_DIR/SHA256SUMS.txt"

unset SIGNING_SECRET PANIC_PASS_STORE_PASSWORD
echo "Release bundle: $RELEASE_DIR/panic-pass-sos-v1.0.0.aab"
