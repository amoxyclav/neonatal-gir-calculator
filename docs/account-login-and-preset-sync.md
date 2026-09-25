# Account login and personal preset sync — setup and implementation plan

## Product behavior
- Offer Google, Apple, and email sign-in, plus Continue as guest.
- Guests can use the complete calculator without an account.
- Signed-in users can save and restore their personal editable presets/preferences across devices.
- Keep patient inputs, current fluid rows, and calculation results on-device. Do not send patient or encounter data to the account backend.
- Keep the calculation engine, formulas, clinical constants, and default presets unchanged.
- Local-first behavior: load local presets immediately; when online and signed in, fetch the user's cloud presets and reconcile. Queue preset changes locally while offline and sync when connectivity returns. Show sync status and handle conflicts explicitly; never silently overwrite newer edits.
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
The app is static HTML/JavaScript and custom presets currently use sessionStorage. Authentication is not active. Provider sign-in and cross-device sync cannot be enabled until a Supabase project and provider credentials are configured. This migration and guide are setup groundwork, not a functioning login feature.

## Clinical safety
Do not modify calculation functions or clinical constants. Review preset serialization/restoration carefully because editable presets can affect clinical outputs.
