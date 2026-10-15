#!/bin/bash
# The Radar's runtime tools: every shell action the daily run and its reading agents need, behind ONE command. A single
# permission rule (see docs/RADAR-PERMISSIONS.md) then covers all of it, so an unattended run never stops at an approval
# prompt. Run it by its absolute path, from anywhere:
#
#   bash /Users/rado/code/ctrlai-com-radar/scripts/radar/rt.sh <tool> [arguments]
#
#   start [RUN]            read the sources, list the candidates            (the run's first step)
#   triage RUN PLAN.json   write triage.json from a plan, record the skips  (see scripts/radar/triage.ts)
#   prepare RUN            save the texts of the deep videos, podcasts and parliament debates, one at a time
#   fetch URL OUT          save a page's text to OUT, which must be inside the archive's runs/ folder
#   check FILE…            check the quotations of entry files against their saved texts
#   lint FILE…             check an entry's own words: pronouns, length limits, excerpt entries without quotations
#   db "SELECT …"          one read-only question to the record's database
#   compose-dry            build the Base in memory and list problems, writing nothing
#   finish RUN             check, build, test, archive and publish (the run's last step)
#
# RUN is a date (2026-10-15). Paths are checked, so a prompt-injected argument cannot write outside the run folders.
set -euo pipefail
ROOT="${RT_ROOT:-/Users/rado/code/ctrlai-com-radar}"
ARCHIVE="${ARCHIVE_DIR:-/Users/rado/code/ctrlai-archive}"
RUNS="$ARCHIVE/runs"
cd "$ROOT"

die() { echo "rt.sh: $*" >&2; exit 2; }
run_dir() { [[ "${1:-}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ || "${1:-}" =~ ^research-[a-z0-9-]+$ ]] || die "RUN must be a date like 2026-10-15, got '${1:-}'"; echo "$RUNS/$1"; }
inside_runs() {
  local p dir
  for p in "$@"; do
    [[ "$p" != *..* ]] || die "no .. in paths: $p"
    dir="$(cd "$(dirname "$p")" 2>/dev/null && pwd -P)" || die "no such folder for $p"
    case "$dir/$(basename "$p")" in "$RUNS"/*) ;; *) die "a path must be inside $RUNS: $p";; esac
  done
}

tool="${1:-}"; [ $# -gt 0 ] && shift
case "$tool" in
  start)       bash scripts/radar/daily-start.sh "$@" ;;
  triage)      d="$(run_dir "${1:-}")"; inside_runs "${2:-}"; npx tsx scripts/radar/triage.ts "$d" "$2" ;;
  prepare)     /Users/rado/code/ctrlai-tools/venv/bin/python -I scripts/radar/prepare.py "$(run_dir "${1:-}")" ;;
  fetch)       [[ "${1:-}" =~ ^https?:// ]] || die "fetch needs an http(s) URL"; inside_runs "${2:-}"; bash scripts/fetch-text.sh "$1" "$2" ;;
  check)       [ $# -gt 0 ] || die "check needs entry files"; inside_runs "$@"; npx tsx scripts/radar/check-entry.ts "$@" ;;
  lint)        [ $# -gt 0 ] || die "lint needs entry files"; inside_runs "$@"; npx tsx scripts/radar/lint-entry.ts "$@" ;;
  db)          NODE_NO_WARNINGS=1 npx tsx scripts/radar/query.ts "${1:-}" ;;
  compose-dry) npx tsx scripts/radar/compose.ts --dry ;;
  finish)      run_dir "${1:-}" >/dev/null; bash scripts/radar/daily-finish.sh "$1" ;;
  *)           sed -n '2,/^# RUN is a date/p' "$0" | sed 's/^# \{0,1\}//' ; [ -z "$tool" ] || die "unknown tool '$tool'" ;;
esac
