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
# Some official sites (the US Bureau of Labor Statistics among them) refuse anonymous scripts but serve a reader that says
# who it is and how to reach it: try once more that way.
if [ "$status" = "403" ]; then
  code=$(curl -sL --compressed --max-time 40 -A "CtrlAI research (https://ctrlai.com/about; hello@ctrlai.com)" -H "Accept: text/html,application/xhtml+xml,application/pdf" -H "Accept-Language: en-US,en;q=0.9" -o "$tmp/raw" -w "%{http_code} %{content_type}" "$url")
  status="${code%% *}"; ctype="${code#* }"
fi
if [ "$status" != "200" ]; then echo "FAILED http=$status url=$url"; rm -rf "$tmp"; exit 1; fi
if echo "$ctype" | grep -qi pdf; then
  pdftotext -layout "$tmp/raw" "$out" && words=$(wc -w < "$out")
  # Some PDFs (often LaTeX) carry no text for the ligatures fi, ff and fl: "firms" comes out "frms". No extractor can
  # recover them, so say so: quotations with those words will fail until the text is repaired against the page images.
  lost=$(grep -o -w -E "frm|frms|efect|efects|ofce|ofcial|fnd|fndings|frst|signifcant|signifcantly|specifc|benefts|profle|infuence|fow|fexible|fle|fles" "$out" | wc -l | tr -d ' ')
  [ "${lost:-0}" -gt 10 ] && echo "WARNING: this PDF's text has lost its fi/ff/fl ligatures (${lost} damaged words such as 'frms'). Repair them against the page images before quoting, and say so in the entry's notes."
else
  words=$(python3 -I "$here/html2text.py" "$tmp/raw" "$out")
fi
echo "ok http=200 type=$ctype words=$words saved=$out"
[ "${words:-0}" -lt 120 ] && echo "WARNING: very little text. The page may be built by JavaScript or may be a block page. Check it before you rely on it."
rm -rf "$tmp"
