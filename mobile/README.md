# Store ERP — Mobile Companion

A React Native (Expo) companion app to the Store POC web app, talking to the
same live backend (`https://backend-production-6f2b.up.railway.app`). No
offline sync, no separate mobile-only backend — a lighter mobile client for
the same data.

## Phase 1 scope (this build)

- Login (same accounts as the web app, e.g. `admin@test.com` / `Password@123`)
- Dashboard — role-aware (Store / Purchase / Sales summary, matching the web app)
- Goods Receipt — list, create, inspect lines, approve
- Material Requests — list, create, approve/reject/forward
- Rejected Material — list, log new entry

Phase 2/3 (Purchase Orders, Inventory lookup, Enquiries/Sales, charts) are
not built yet — see the plan discussed in the session that created this app.

## Run it on your phone

1. Install the **Expo Go** app from the App Store / Play Store on your phone.
2. On your computer, from this folder:
   ```
   npm install
   npx expo start
   ```
3. Scan the QR code Expo prints with your phone's camera (iOS) or the Expo Go
   app's scanner (Android). Your phone must be on the same Wi-Fi network as
   your computer for the default connection mode to work.
4. The app loads on your phone, live-reloading as the code changes.

## Structure

```
src/
  api/client.js        — axios instance + JWT interceptor, points at the live backend
  auth/AuthContext.js   — login/logout, token in Expo SecureStore (encrypted)
  components/           — PickerField (searchable select), StatusChip, EmptyState
  navigation/            — bottom tabs + per-feature stacks
  screens/               — one screen per feature
  theme/theme.js         — same indigo palette as the web app's vmgTheme.js
```
