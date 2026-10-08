# Scan Anything AI for iOS

Native journal for James's Scan Anything web app. Point the camera at an object, read text and barcodes on device, and — when you add a key — ask an OpenAI-compatible vision model what it is. Discoveries, collections, notes, quests, and XP stay on the iPhone.

The look is a dark amber journal: glassy cards, a glowing Discover button, an animated scan reticle, and a rarity-colored reveal when a find lands. Motion eases off when Reduce Motion is on. Type follows Dynamic Type.

The React app in the repository root is unchanged.

## Open the project

1. Unzip `ScanAnythingAI.zip` if you are starting from the archive, or open this folder.
2. Open `ScanAnythingAI.xcodeproj` in Xcode 16 or newer (iOS 17 SDK).
3. Select the ScanAnythingAI scheme and an iPhone simulator or a device.
4. Run.

`project.yml` is the XcodeGen spec. The checked-in `.xcodeproj` was generated to match the Swift files on disk. After adding or removing source files, regenerate it:

```bash
python3 scripts/generate_xcodeproj.py
```

Or, on a Mac with [XcodeGen](https://github.com/yonaskolb/XcodeGen) installed:

```bash
xcodegen generate
```

From the same folder, a command-line build looks like this:

```bash
xcodebuild -project ScanAnythingAI.xcodeproj -scheme ScanAnythingAI -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Signing uses Automatic. Set your Team on the ScanAnythingAI target before you archive for the App Store. The bundle id is `ai.scananything.app`.

## Configure the AI key

The app runs without a key. Text and barcodes are read with Apple Vision, and a journal entry is still saved.

For the full identification (name, category, facts, care, rarity, follow-up chat):

1. Open Profile.
2. Paste an API key. It is stored in the iOS Keychain, not in source.
3. Leave the base URL as `https://api.openai.com/v1`, or point it at any service that accepts `POST /chat/completions` with an image content part.
4. Leave the model as `gpt-4o-mini`, or set another vision-capable model id.
5. Tap Save AI settings, then Check connection.

You can also ship a development key in the app bundle without committing it. Copy `Config/AIConfig.example.plist` to `ScanAnythingAI/AIConfig.plist`, fill in `APIKey`, and add that file to the app target's Copy Bundle Resources. A key typed in Profile overrides it. `AIConfig.plist` is gitignored.

The analyzer is `OpenAICompatibleAnalyzer` in `ScanAnythingAI/Services`, behind the `DiscoveryAnalyzing` protocol. A different backend is a new type that implements that protocol; the scanner does not need to change.

## What the app does

- Onboarding, then Explore, Finds, Quests, and Profile, with the camera on the center button.
- Identify mode captures a still, runs Vision, looks up a product barcode, then the configured model only if the catalog has no listing. Pinch to zoom, tap to focus, torch, photo library, and the document camera are included.
- Live mode uses VisionKit's data scanner when the device supports it, and falls back to the AVFoundation preview with live text and barcode chips. Saving a product barcode names it from the catalog before anything else.
- Barcode lookup is on by default and can be turned off in Profile. A GTIN is sent to Open Food Facts, then Open Beauty Facts, then Open Products Facts. The photo is not sent with that request. QR codes and other non-product symbols are not looked up.
- Low-confidence and offline scans still save, with a note that the read was on-device.
- Finds can be searched, favorited, tagged, noted, collected, shared, and shown on a map. Nearby pins group into one neighborhood marker. A distance control limits the map to Anywhere, 1 km, 5 km, or 25 km from where you are.
- "Seen this?" compares a photo with the journal on device and says whether you have scanned that object before. The same check runs after a new capture.
- With no API key, text and barcodes still name the find. On iPhone with Apple Intelligence, that read can be rewritten on device. The photo is not sent away.
- Share builds a card (photo, name, rarity, confidence, and a short line) and sends that image with the written find. The card is what Save Image stores. The plain photo is used on the card, not as a second attachment.
- XP, seven levels, streaks, achievements, and a rotating set of daily and weekly quests follow the web app's rules, with a few extra badges for text and barcodes.
- Ask-about-this-object chat is stored on the discovery.
- Export writes a JSON journal. Erase deletes local photos and records.

Location tags are off until you turn them on in Profile. The map's Near me distances ask for location only while the app is open.

## Streak widget and Scan control

The Home Screen and Lock Screen widget shows the streak, level, and XP. Tapping it opens the camera. On iOS 18, Control Center and the Lock Screen can add a Scan button that does the same.

Both read an App Group, `group.ai.scananything.app`. In the Apple Developer account, turn on App Groups for the app id `ai.scananything.app` and the widget id `ai.scananything.app.widget`, using that group. A personal (free) team cannot sign App Groups. The journal still runs; the widget stays empty until the group is on the provisioning profile.

## Checks that ran here

`ScanAnythingCore` builds and its tests pass with Swift (`swift test`). That covers XP, levels, streaks, achievements, quest rotation, JSON decoding, on-device fallback text, the on-device category guess, the on-device model prompt, share copy, share-card wording, GTIN normalization, Open Food Facts response mapping, nearby-pin clustering, the 1/5/25 km filter, and "seen before" ranking.

This machine has no Xcode and no iOS SDK, so the app target and the widget were not compiled or launched. Build them on a Mac before treating the project as signed off.
