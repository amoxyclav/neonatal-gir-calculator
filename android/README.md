# Neonatal GIR & Nutrition Calculator — Android APK

This Android app wraps the calculator and guide pages in an Android WebView and bundles the website files for offline use.

## Mobile experience
- The calculator keeps the same Home, GIR, Nutrition and Mixer navigation on the main calculator and guide pages.
- Predefined fluids use a compact, grouped picker instead of the oversized native select menu.
- Android Back returns to Home from another page; Back on Home asks whether to exit.
- The launcher icon uses the blue droplet brand mark.

## Build
The GitHub Actions workflow **Build Android APK** builds a debug APK and uploads it as a downloadable workflow artifact. The APK is unsigned for Play Store distribution; it is intended for direct testing/installation.

## Important
The app is a WebView-based wrapper, not a native rewrite. The bundled calculator can work offline, while external links require an internet connection.
