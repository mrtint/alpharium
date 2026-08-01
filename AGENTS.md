# Expo HAS CHANGED

This project targets **Expo SDK 54**. Read the exact versioned docs at
https://docs.expo.dev/versions/v54.0.0/ before writing any code.

Do not guess package versions. `expo install` resolves them from Expo's API
(`sdks/:sdkVersion/native-modules`), not from the npm registry — so `npm view`
gives wrong answers. Look versions up in the versioned docs or via context7
(`/expo/expo` branch `sdk-54`), then verify with `npx expo install --check`.

Note: `expo-status-bar` and `@expo/metro-runtime` do not follow SDK numbering
(SDK 54 uses `3.0.9` and `6.1.2`).

## Why SDK 54, not 57

Play Store only ships Expo Go 54 for the target test device, and Expo Go
supports exactly one SDK. Staying on 54 keeps the app runnable in Expo Go
without sideloading an APK.

## Running on a phone

Metro binds to IPv6 (`::`) on this machine, so the Wi-Fi LAN IP is unreachable
even locally. Use the Tailscale address instead:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "100.98.26.61"; npx expo start --host lan
```

Then open `exp://100.98.26.61:8081` in Expo Go (phone needs Tailscale connected).
