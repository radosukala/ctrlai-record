#!/bin/bash
# Usage: fetch-text.sh URL OUTFILE   -- saves the page's plain text to OUTFILE (HTML or PDF), prints status and word count.
# Many sites refuse non-browser requests (HTTP 403) or build the page with JavaScript (almost no text). When that happens,
# open the page in the built-in browser (mcp__Claude_Browser__navigate + get_page_text) and save that text to OUTFILE yourself.
set -u
url="$1"; out="$2"
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
mkdir -p "$(dirname "$out")"
code=$(curl -sL --compressed --max-time 40 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" -H "Accept-Language: en-US,en;q=0.9" -o "$tmp/raw" -w "%{http_code} %{content_type}" "$url")
status="${code%% *}"; ctype="${code#* }"
if [ "$status" != "200" ]; then echo "FAILED http=$status url=$url"; rm -rf "$tmp"; exit 1; fi
if echo "$ctype" | grep -qi pdf; then
  pdftotext -layout "$tmp/raw" "$out" && words=$(wc -w < "$out")
else
  words=$(python3 -I "$here/html2text.py" "$tmp/raw" "$out")
fi
echo "ok http=200 type=$ctype words=$words saved=$out"
[ "${words:-0}" -lt 120 ] && echo "WARNING: very little text. The page may be built by JavaScript or may be a block page. Check it before you rely on it."
rm -rf "$tmp"
