# News Thumbnail Maker — Android App

This is your React app wrapped with [Capacitor](https://capacitorjs.com/) so it can be
built into a real Android APK / App Bundle. The canvas export now uses the
native Filesystem plugin (saves to the Documents/Pictures area on the device)
instead of the browser `<a download>` trick, which doesn't work inside an
Android WebView.

I can't produce the final `.apk` file myself (this sandbox has no Android SDK
/ Gradle), so the steps below are what you run **on your own computer** to get
the installable app. It's mostly copy-pasting commands — should take about
15–20 minutes the first time.

## Prerequisites (install once)

1. **Node.js** (v18 or newer) — https://nodejs.org
2. **Android Studio** — https://developer.android.com/studio
   (this also installs the Android SDK you need)
3. A **JDK** (Android Studio bundles one — no separate install needed)

## Steps

```bash
# 1. Unzip this project and go into it
cd news-thumbnail-maker
npm install

# 2. Build the web app
npm run build

# 3. Add the Android platform (only needed once)
npx cap add android

# 4. Copy the built web app into the Android project
npx cap sync android

# 5. Open it in Android Studio
npx cap open android
```

Android Studio will open the `android/` folder. From there:

- Click the green **Run ▶** button with an emulator or a phone connected via
  USB (with USB debugging enabled) to test it live.
- To get an installable file: **Build → Build Bundle(s) / APK(s) → Build
  APK(s)**. The `.apk` will appear under
  `android/app/build/outputs/apk/debug/app-debug.apk` — copy that to your
  phone and install it (you'll need to allow "install from unknown sources").
- To publish on the **Play Store**, use **Build → Generate Signed Bundle /
  APK**, choosing "Android App Bundle", and follow Android Studio's prompts
  to create a signing key. Play Store submission requires a signed release
  build, not the debug APK.

## Making changes later

Whenever you edit files in `src/`:

```bash
npm run build
npx cap sync android
```

then re-run from Android Studio.

## Notes

- `appId` in `capacitor.config.ts` (`com.yourcompany.newsthumbnailmaker`) is
  the app's unique package ID — change it to your own reverse-domain name
  before publishing (this can't be changed after you publish to Play Store).
- The saved PNG goes to the device's `Documents` folder via
  `@capacitor/filesystem`. If you'd rather it show up directly in the phone's
  **Gallery/Photos** app, switch `Directory.Documents` to `Directory.ExternalStorage`
  and add a `MediaScanner` step, or swap in the
  `@capacitor-community/media` plugin — happy to wire that up if you want.
- App icon / splash screen: Capacitor uses whatever's in `android/app/src/main/res/`.
  The `@capacitor/assets` tool can auto-generate these from a single source image:
  `npm install @capacitor/assets --save-dev` then
  `npx capacitor-assets generate` (after adding an `assets/icon.png` and
  `assets/splash.png`).
