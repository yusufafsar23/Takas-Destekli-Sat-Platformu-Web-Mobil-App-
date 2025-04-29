@echo off
set NODE_OPTIONS=--no-experimental-fetch --no-experimental-global-webcrypto --require=./fix-webstream-polyfill.js
set EXPO_NO_TELEMETRY=1
npx expo start --clear 