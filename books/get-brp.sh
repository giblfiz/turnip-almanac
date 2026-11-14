#!/usr/bin/env bash
# Re-download Chaosium's Basic Roleplaying ORC Content Document (ORC licence).
# The PDF is not committed (see .gitignore); run this to fetch it.
set -euo pipefail
cd "$(dirname "$0")"
curl -fL --retry 3 -A "Mozilla/5.0 (X11; Linux x86_64)" \
  -o brp-orc.pdf \
  "https://www.chaosium.com/content/orclicense/BasicRoleplaying-ORC-Content-Document.pdf"
echo "saved $(pwd)/brp-orc.pdf ($(wc -c < brp-orc.pdf) bytes)"
