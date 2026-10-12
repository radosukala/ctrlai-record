"""Saves a YouTube video's English captions for the Radar.

  python -I scripts/radar/transcript.py VIDEO_ID OUT_BASE

Writes OUT_BASE.transcript.json ({videoId, generated, segments: [{start, text}]}) and OUT_BASE.txt (the captions joined,
which is what quotes are checked against). Needs youtube-transcript-api 1.2.x. "generated" true means YouTube's automatic
captions: they carry no speaker names and can mishear words, so a person listens before any quote from them is published.
Captions are other people's words: the files stay in the private run folder.
"""
import datetime
import json
import sys

from youtube_transcript_api import YouTubeTranscriptApi

vid, base = sys.argv[1], sys.argv[2]
t = YouTubeTranscriptApi().fetch(vid, languages=['en', 'en-US', 'en-GB'])
segments = [{'start': round(s.start, 2), 'text': s.text} for s in t.snippets]
doc = {
    'videoId': vid,
    'language': t.language_code,
    'generated': t.is_generated,
    'fetchedOn': datetime.date.today().isoformat(),
    'segments': segments,
}
with open(base + '.transcript.json', 'w', encoding='utf-8') as f:
    json.dump(doc, f, ensure_ascii=False)
text = ' '.join(s['text'].replace('\n', ' ').strip() for s in segments)
with open(base + '.txt', 'w', encoding='utf-8') as f:
    f.write(text + '\n')
words = len(text.split())
last = segments[-1]['start'] if segments else 0
print(f"ok video={vid} generated={t.is_generated} segments={len(segments)} words={words} minutes~{int(last // 60)} saved={base}.txt")
