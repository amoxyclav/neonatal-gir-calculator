# Account login and personal preset sync — setup and implementation plan

## Product behavior
- Offer Google, Apple, and email sign-in, plus Continue as guest.
- Guests can use the complete calculator without an account.
- Signed-in users can save and restore their personal editable presets/preferences across devices.
- Keep patient inputs, current fluid rows, and calculation results on-device. Do not send patient or encounter data to the account backend.
- Keep the calculation engine, formulas, clinical constants, and default presets unchanged.
- Local-first behavior: calculator and local preset editing remain available offline. In this version, a signed-in user manually starts sync while online. If both local and cloud presets exist, the app asks whether to restore cloud values or upload local values. Automatic background/offline sync queues are not implemented; do not silently overwrite edits.
- Signing out must not delete guest data without confirmation. Account data must be isolated per authenticated user.

## Backend choice
Use Supabase Auth + Postgres for Google OAuth, Apple OAuth, and email OTP/magic-link authentication. Database migration: supabase/migrations/202609260001_user_preset_settings.sql.

## Required one-time setup
1. Create a Supabase project at https://supabase.com/ and select a region.
2. In Project Settings → API, copy the Project URL and publishable/anon client key. Never expose the service-role/secret key in browser or Android code.
3. Run the SQL migration using the Supabase SQL Editor.
4. In Authentication → URL Configuration, add the deployed GitHub Pages origin and appropriate callback/redirect URLs for web and Android.
5. Enable Google provider and configure OAuth credentials and authorized redirect URI.
6. Enable Apple provider and configure Services ID, Team ID, Key ID, and private key. Apple Developer enrollment may be required and may cost money; do not proceed with paid enrollment without owner approval.
7. Configure email OTP/magic link and allowed redirect URLs. Production email delivery may need custom SMTP and could cost money.
8. Supply the project URL and publishable/anon key through a safe runtime config. Never commit provider secrets or service-role keys.

## Implementation sequence
1. Add an account/sign-in panel and account status indicator without changing clinical screens or calculations.
2. Implement Google, Apple, email OTP/magic-link, guest mode, sign-out, and session restoration.
3. Serialize only user-editable preset values and preferences. Never upload patient/session state.
4. Add local persistence and an offline change queue. Keep patient input persistence separate. Validate imported data and version the schema.
5. Use row-level security and test that accounts cannot read/write another user's data.
6. Test guest use, auth flows/cancellation, network failure, offline edits, sync retry, conflict handling, account switching, malformed presets, and restoration.
7. Only after tests pass, integrate with Android. Do not block local calculations or offline launch on auth/network availability.

## Current integration status
The app is static HTML/JavaScript and custom presets currently use sessionStorage. The Profile UI, Supabase client flow, and Android deep-link bridge are implemented on the account feature branch. Google/Apple/email provider configuration and Android physical-device testing are still pending. Preset/preferences sync is user-initiated; automatic background sync and a durable offline queue are not yet implemented.

## Clinical safety
Do not modify calculation functions or clinical constants. Review preset serialization/restoration carefully because editable presets can affect clinical outputs.


## Android offline calculator with online account sign-in
- The Android calculator UI and calculation code continue to load from bundled local HTML assets. Calculations do not require a network connection.
- The Android app uses the internet only for account sign-in and an explicit personal preset/preferences sync. The native bridge opens the Supabase OAuth URL in the system browser and returns through the `neonatalgir://auth-callback` deep link; the app uses PKCE to exchange the one-time callback code.
- Supabase Authentication → URL Configuration must allow `neonatalgir://auth-callback` as a redirect URL. Google/Apple provider setup and the Supabase OAuth callback configuration are still required.
- The Supabase JS library is loaded from a CDN only after the user opens Profile or starts an account action. Calculator startup does not wait for the network. If the library cannot load, account actions show a connection message while the calculator remains available.
- Patient inputs, current fluid rows, and calculation results are never included in sync payloads.
- Android deep-link callback, provider login, session persistence, and offline/online transitions must be tested on a physical device before release. This code does not mean provider sign-in is already configured or verified.
