#!/bin/bash
# The daily Radar, second half: check every quotation the run's agents wrote, rebuild the Base, test it, keep the full
# texts in the private archive, and publish. Nothing is pushed if any check or test fails.
#
#   bash scripts/radar/daily-finish.sh RUN
set -euo pipefail
RUN="$1"
cd "$(git rev-parse --show-toplevel)"
RADAR_DOCS="$(npx tsx -e "import { RADAR_DOCS } from './scripts/radar/paths'; console.log(RADAR_DOCS)")"
DIR="$RADAR_DOCS/$RUN"
ARCHIVE_DIR="$(npx tsx -e "import { ARCHIVE_DIR } from './scripts/radar/paths'; console.log(ARCHIVE_DIR)")"
shopt -s nullglob
ENTRIES=("$DIR"/entries/*.json)
if [ ${#ENTRIES[@]} -eq 0 ]; then echo "No entries in $DIR/entries: nothing to publish."; exit 0; fi

echo "== Quotations"
npx tsx scripts/radar/check-entry.ts "${ENTRIES[@]}" | tail -3 || { echo "STOP: a quotation failed its check; fix or remove it, then run this again"; exit 1; }
echo "== Compose"
npx tsx scripts/radar/compose.ts > "$DIR/compose.log" 2>&1 || { grep -E "PROBLEM|dropped|Nothing written" "$DIR/compose.log" | head -20; echo "STOP: the Base could not be built; nothing was written or pushed (see $DIR/compose.log)"; exit 1; }
tail -2 "$DIR/compose.log"
echo "== Moments"
# When each quotation said in a recording is spoken, word by word, for the page's play buttons (content/base/moments.json).
# Never stops the run: a quotation without a moment is shown as text, with a link to its second.
if npx tsx scripts/radar/moments.ts > "$DIR/moments.log" 2>&1; then tail -1 "$DIR/moments.log"; else echo "WARNING: the moments could not be timed (see $DIR/moments.log); the run publishes anyway"; fi
echo "== Types and tests"
npx tsc --noEmit || { echo "STOP: type errors; nothing pushed"; git checkout -- content/base; exit 1; }
if ! npm test > "$DIR/test.log" 2>&1; then grep -E "✖|AssertionError" "$DIR/test.log" | head -20; echo "STOP: tests fail (see $DIR/test.log); nothing pushed"; git checkout -- content/base; exit 1; fi
grep -E "^ℹ (tests|pass|fail)" "$DIR/test.log"

echo "== Posts"
# The day's posts for X and LinkedIn, drafted into the run folder (posts/POSTS.md and the cards) for REPORT.md. Nothing is
# posted; a person posts. Drafting them never stops the run: the record is published either way.
if npx tsx scripts/social.ts day "$RUN" --out "$DIR/posts" > "$DIR/posts.log" 2>&1; then tail -3 "$DIR/posts.log"; else echo "WARNING: the posts could not be drafted (see $DIR/posts.log); the run publishes anyway"; fi

echo "== Archive"
ARCHIVE_DIR="$ARCHIVE_DIR" npx tsx scripts/radar/archive.ts --run "$RUN" | tail -1
( cd "$ARCHIVE_DIR" && git add -A && { git diff --cached --quiet || git -c user.name=radosukala -c user.email=sukala@me.com commit -q -m "Radar run $RUN"; } && git pull -q --rebase && git push -q ) || echo "WARNING: the archive could not be pushed; it is safe locally in $ARCHIVE_DIR"

echo "== Internal documents"
# Ctrl AI's working folder (plans, research, film sources) is its own private repository; keep it pushed too.
INTERNAL="${INTERNAL_DIR:-/Users/rado/code/ctrlai-com/docs-internal}"
if [ -d "$INTERNAL/.git" ]; then
  ( cd "$INTERNAL" && git add -A && { git diff --cached --quiet || git -c user.name=radosukala -c user.email=sukala@me.com commit -q -m "Daily backup $RUN"; } && git pull -q --rebase && git push -q && echo "pushed" ) || echo "WARNING: the internal documents could not be pushed; they are safe locally in $INTERNAL"
fi

echo "== Database"
npx tsx scripts/radar/build-db.ts 2>/dev/null | tail -1 || echo "WARNING: the database could not be rebuilt; the record itself is safe"

echo "== Publish"
git add content/base
if git diff --cached --quiet; then echo "The Base did not change."; exit 0; fi
N=$(ls "$DIR"/entries/*.json | wc -l | tr -d ' ')
git commit -q -m "Radar: $RUN, $N entries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch -q origin
git rebase -q origin/main || { git rebase --abort; echo "STOP: could not rebase onto origin/main; commit kept locally, not pushed"; exit 1; }
git push -q origin HEAD:main
git log --oneline -1
echo "Pushed to main; Vercel deploys it in about a minute."
