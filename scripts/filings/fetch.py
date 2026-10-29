"""
Saves a filing, and the company's own public pages it is compared with, to the private archive as HTML and as text.

    python3 scripts/filings/fetch.py <archive folder> <url> [<url> ...]

The folder is relative to the archive (ARCHIVE_DIR, else ../ctrlai-archive). A page already saved is not fetched again.
An SEC filing's text keeps its pages: each starts with a line `[[page N]]`, N counting the HTML's pages, and the page
number printed on the page follows as the first line when there is one. scripts/filings/check.ts reads these texts and
finds every passage on the filing's page, word for word.
"""
import html
import os
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

UA = 'CtrlAI research (+https://ctrlai.com/about)'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ARCHIVE = os.environ.get('ARCHIVE_DIR') or next((p for p in [os.path.join(ROOT, '..', 'ctrlai-archive'), '/Users/rado/code/ctrlai-archive'] if os.path.isdir(p)), None)


class Text(HTMLParser):
    """Visible text, one line per block. An SEC filing's pages (fixed 792pt-high boxes) become `[[page N]]` lines."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip, self.page = [], 0, 0

    def handle_starttag(self, tag, attrs):
        style = dict(attrs).get('style') or ''
        if tag in ('script', 'style', 'noscript', 'svg'):
            self.skip += 1
        if tag == 'div' and 'height:792pt' in style:
            self.page += 1
            self.out.append(f'\n\n[[page {self.page}]]\n')
        if tag in ('div', 'p', 'tr', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'section', 'article'):
            self.out.append('\n')
        if tag == 'td':
            self.out.append(' | ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg') and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)


def text_of(src: str) -> str:
    parser = Text()
    parser.feed(src)
    txt = html.unescape(''.join(parser.out)).replace('\xa0', ' ')
    txt = re.sub(r'[ \t]+', ' ', txt)
    return re.sub(r'\n\s*\n+', '\n\n', txt).strip() + '\n'


def main():
    if len(sys.argv) < 3 or not ARCHIVE:
        sys.exit(__doc__)
    folder = os.path.join(ARCHIVE, sys.argv[1])
    os.makedirs(folder, exist_ok=True)
    for url in sys.argv[2:]:
        name = re.sub(r'\.html?$', '', url.rstrip('/').split('/')[-1])
        path = os.path.join(folder, f'{name}.html')
        if not os.path.exists(path):
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
                f.write(r.read())
            time.sleep(1)  # one request a second at most, as the SEC asks
        src = open(path, encoding='utf-8', errors='replace').read()
        txt = text_of(src)
        open(os.path.join(folder, f'{name}.txt'), 'w').write(txt)
        print(f'{name}: {len(txt):,} characters{f", {txt.count(chr(10) + "[[page ")} pages" if "[[page " in txt else ""}')


if __name__ == '__main__':
    main()
