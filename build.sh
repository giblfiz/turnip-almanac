#!/usr/bin/env bash
# Build the page from src/: head + style + body + the rig/campaign scripts + the app, in one file.
# Usage: ./build.sh            (writes index.html)
set -euo pipefail
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n'
  cat src/head.html
  printf '<style>'; cat src/style.css; printf '</style>'
  cat src/body.html
  cat src/scripts.html
  printf '<script>\n'; cat src/app.js; printf '</script>\n'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
