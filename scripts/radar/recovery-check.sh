#!/bin/bash
# Proves the public Base can be rebuilt from scratch: clones ctrlai.com's repository and the private archive into a
# temporary folder, rebuilds content/base from the archive's run folders alone, and compares it byte for byte with what
# is published on main. Then builds the database from the fresh clones too. Run it after any change to the scripts.
#
#   bash scripts/radar/recovery-check.sh
set -euo pipefail
here="$(git rev-parse --show-toplevel)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git clone -q --depth 1 https://github.com/radosukala/ctrlai-record.git "$tmp/site"
git clone -q --depth 1 https://github.com/radosukala/ctrlai-archive.git "$tmp/archive"
echo "fresh clones: site $(git -C "$tmp/site" rev-parse --short HEAD), archive $(git -C "$tmp/archive" rev-parse --short HEAD)"
# The dependencies are the same packages; only the code and the data come from the fresh clones.
ln -s "$here/node_modules" "$tmp/site/node_modules"
cp -R "$tmp/site/content/base" "$tmp/published"

cd "$tmp/site"
ARCHIVE_DIR="$tmp/archive" npx tsx scripts/radar/compose.ts > "$tmp/compose.log" 2>&1 || { tail -20 "$tmp/compose.log"; echo "FAILED: the Base could not be rebuilt from the archive"; exit 1; }
tail -1 "$tmp/compose.log"
fail=0
for f in entries people names runs verification stories; do
  if cmp -s "content/base/$f.json" "$tmp/published/$f.json"; then echo "  same: $f.json"; else echo "  DIFFERENT: $f.json"; fail=1; fi
done
ARCHIVE_DIR="$tmp/archive" npx tsx scripts/radar/build-db.ts 2>/dev/null | tail -1
[ $fail -eq 0 ] && echo "OK: the published Base is rebuilt exactly from fresh clones." || { echo "FAILED: the rebuilt Base differs from the published one"; exit 1; }
