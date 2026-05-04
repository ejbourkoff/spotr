# SPOTR iOS App — Xcode Setup

## Requirements
- macOS 14+
- Xcode 15+
- iOS 17+ deployment target

## Create the Xcode Project

1. Open Xcode → **File > New > Project**
2. Choose **iOS > App**, click Next
3. Fill in:
   - **Product Name:** SPOTR
   - **Team:** Your Apple Developer team (or Personal Team for simulator)
   - **Organization Identifier:** com.spotr (or your bundle ID)
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Storage:** None
   - Uncheck "Include Tests" (optional)
4. Save to the **`ios/`** directory — Xcode will create `ios/SPOTR.xcodeproj`

## Add the Source Files

After creating the project, replace the generated files with the ones in this repo:

1. In Xcode's Project Navigator, delete the auto-generated `ContentView.swift` and `Assets.xcassets` (move to trash)
2. Right-click the **SPOTR** group → **Add Files to "SPOTR"...**
3. Select the entire `ios/SPOTR/` folder, checking:
   - ✅ Copy items if needed
   - ✅ Create groups
   - ✅ Add to target: SPOTR
4. Click Add

Your file tree should look like:
```
SPOTR/
├── SPOTRApp.swift
├── Models/
│   └── Models.swift
├── Services/
│   ├── APIService.swift
│   ├── AuthManager.swift
│   └── KeychainHelper.swift
├── Extensions/
│   └── Color+SPOTR.swift
└── Views/
    ├── RootView.swift
    ├── Main/
    │   └── MainTabView.swift
    ├── Auth/
    │   ├── LoginView.swift
    │   └── SignupView.swift
    ├── Feed/
    │   ├── FeedView.swift
    │   ├── PostCard.swift
    │   └── StoryBar.swift
    ├── Stories/
    │   └── StoryViewer.swift
    ├── Reels/
    │   └── ReelsView.swift
    ├── Profile/
    │   ├── ProfileView.swift
    │   └── PostDetailSheet.swift
    ├── Post/
    │   └── CreatePostView.swift
    ├── Messages/
    │   └── MessagesView.swift
    └── Discover/
        └── DiscoverView.swift
```

## Info.plist Permissions

Add these keys to your `Info.plist` (or via Xcode's **Signing & Capabilities** → **Info** tab):

| Key | Value |
|-----|-------|
| `NSPhotoLibraryUsageDescription` | "SPOTR needs photo access to share highlights." |
| `NSCameraUsageDescription` | "SPOTR needs camera access to record highlights." |

To add: In Xcode, click the project → select the SPOTR target → **Info** tab → click **+** under Custom iOS Target Properties.

## App Transport Security (if needed)

If you hit ATS issues in development, add to Info.plist:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```
The production backend runs HTTPS so this should not be needed.

## Run

1. Select an iPhone simulator (iOS 17+) from the device picker
2. Press **⌘R** to build and run
3. Log in with any account from the production backend at `https://spotr-production.up.railway.app`

## Test Accounts

Use the seed accounts from the backend:
- Athlete: `athlete1@spotr.com` / `password123`
- Coach: `coach1@spotr.com` / `password123`
- Brand: `brand1@spotr.com` / `password123`

## Submitting to App Store

1. Change the bundle ID to your registered App Store bundle ID
2. Set the deployment target to iOS 17.0
3. Create an App Store Connect listing
4. Archive: **Product > Archive**
5. Distribute via the Organizer

## Key Architecture Notes

- **Auth**: JWT stored in iOS Keychain via `KeychainHelper`. `AuthManager` is an `@EnvironmentObject` injected at root.
- **API**: All calls go through `APIService.shared` to `https://spotr-production.up.railway.app/api`
- **Video**: Mux HLS via `AVKit.VideoPlayer`. Stream URL: `https://stream.mux.com/{playbackId}.m3u8`
- **Images**: Cloudinary via `AsyncImage`. Upload via multipart to `/api/upload`
- **No third-party dependencies** — pure SwiftUI + AVKit + PhotosUI
