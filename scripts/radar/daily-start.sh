#!/bin/bash
# The daily Radar, first half: bring this checkout up to date, read every source for yesterday and today, and list the
# items no earlier run has handled. Run from the repo root of the Radar's own worktree (/Users/rado/code/ctrlai-com-radar).
#
#   bash scripts/radar/daily-start.sh [RUN]        RUN defaults to today's date, YYYY-MM-DD
#
# Stops (exit 1) instead of guessing when the checkout has local changes, main can't be fast-forwarded, or the disk is
# nearly full.
set -euo pipefail
RUN="${1:-$(date +%Y-%m-%d)}"
FROM="$(date -v-1d -j -f %Y-%m-%d "$RUN" +%Y-%m-%d)"
cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then echo "STOP: this checkout has local changes:"; git status --short; exit 1; fi
git fetch -q origin
git merge -q --ff-only origin/main || { echo "STOP: main can't be fast-forwarded"; exit 1; }
FREE_GB=$(df -g /System/Volumes/Data | awk 'NR==2 {print $4}')
if [ "${FREE_GB:-0}" -lt 2 ]; then echo "STOP: only ${FREE_GB} GB free on the disk"; exit 1; fi

RADAR_DOCS="$(npx tsx -e "import { RADAR_DOCS } from './scripts/radar/paths'; console.log(RADAR_DOCS)")"
DIR="$RADAR_DOCS/$RUN"
mkdir -p "$DIR/entries" "$DIR/sources"
npx tsx scripts/radar/ingest.ts --from "$FROM" --to "$RUN" --run "$RUN" | tail -3
sed "s|{{RUN}}|$DIR|g" radar/AGENT-BRIEF.md > "$DIR/AGENT-BRIEF.md"
npx tsx scripts/radar/candidates.ts --run "$RUN"
echo "RUN=$RUN DIR=$DIR"
