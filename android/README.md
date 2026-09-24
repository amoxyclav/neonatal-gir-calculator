# Neonatal GIR Calculator — Android APK

This Android app wraps the existing live calculator website in an Android WebView. It does not change the calculator website or its calculations. An internet connection is required to load the calculator.

## Build
The GitHub Actions workflow **Build Android APK** builds a debug APK and uploads it as a downloadable workflow artifact. The APK is unsigned for Play Store distribution; it is intended for direct testing/installation.

## Important
This wrapper displays the currently published website. It is not an offline-capable native rewrite.