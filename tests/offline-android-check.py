#!/usr/bin/env python3
"""Static guardrails for the Android app's fully offline runtime."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = [
    ROOT / "index.html",
    ROOT / "guides/neonatal-gir-calculator.html",
    ROOT / "guides/neonatal-fluid-nutrition-calculator.html",
    ROOT / "guides/neonatal-fluid-mixer.html",
]
REMOTE_RESOURCE = re.compile(
    r"""<(?:script|iframe|img|source|video|audio|embed|object)\b[^>]*(?:src|data)\s*=\s*["']\s*https?://"""
    r"""|<link\b[^>]*rel\s*=\s*["'][^"']*(?:stylesheet|preload|modulepreload)[^"']*["'][^>]*href\s*=\s*["']\s*https?://"""
    r"""|<link\b[^>]*href\s*=\s*["']\s*https?://[^"']*["'][^>]*rel\s*=\s*["'][^"']*(?:stylesheet|preload|modulepreload)""",
    re.IGNORECASE,
)
NETWORK_API = re.compile(r"\b(?:fetch\s*\(|XMLHttpRequest\b|WebSocket\s*\(|EventSource\s*\()", re.IGNORECASE)

errors = []
for path in HTML_FILES:
    if not path.is_file():
        errors.append(f"Required offline page missing: {path.relative_to(ROOT)}")
        continue
    content = path.read_text(encoding="utf-8")
    if REMOTE_RESOURCE.search(content):
        errors.append(f"Remote runtime resource reference found in {path.relative_to(ROOT)}")
    if NETWORK_API.search(content):
        errors.append(f"Network API usage found in {path.relative_to(ROOT)}")

activity = ROOT / "android/app/src/main/java/com/neonatalgir/calculator/MainActivity.java"
if activity.exists():
    code = activity.read_text(encoding="utf-8")
    for marker in ("setBlockNetworkLoads(true)", "setAllowFileAccess(true)", "setAllowContentAccess(false)"):
        if marker not in code:
            errors.append(f"Android WebView offline setting missing: {marker}")

manifest = ROOT / "android/app/src/main/AndroidManifest.xml"
if manifest.exists() and "android.permission.INTERNET" in manifest.read_text(encoding="utf-8"):
    errors.append("Android manifest still requests INTERNET permission.")

if errors:
    print("\n".join("ERROR: " + error for error in errors), file=sys.stderr)
    sys.exit(1)

print("Offline Android check passed: bundled pages are present, no remote runtime dependencies or network APIs were detected, and Android WebView networking is disabled.")
