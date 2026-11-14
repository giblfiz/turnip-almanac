#!/usr/bin/env bash
# Rebuild index.html from build/src, build/css and the base page. Usage: build/build.sh
# The pipeline edits some sources in place (the patch scripts are idempotent), so it runs on a staged copy.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
stage="$here/.stage"; rm -rf "$stage"; mkdir -p "$stage"
cp "$here"/src/*.js "$here"/css/*.css "$here"/index.v15.html "$stage"/
export ALMANAC_STAGE="$stage"
for p in patch_v4 patch_v6 patch_v7 patch_v8 patch_v11; do python3 "$here/$p.py" >/dev/null 2>&1; done
python3 "$here/assemble3.py"
rm -rf "$stage"
