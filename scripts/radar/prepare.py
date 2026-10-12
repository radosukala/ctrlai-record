"""Prepares the text of every video and podcast item a run will read, ONE AT A TIME, before the reading agents start.

  /Users/rado/code/ctrlai-tools/venv/bin/python -I scripts/radar/prepare.py RUN_DIR

For each deep item in RUN_DIR/triage.json that is audio or video and has no saved text yet, the first that works:
  1. the publisher's own transcript listed in the feed (<podcast:transcript>), saved as the source text;
  2. the podcast audio (the item's own, or the same episode found in the run's podcast feeds by title and date):
     scripts/radar/transcribe.py with Nemotron, plus a second, independent Whisper transcript on this Mac;
  3. YouTube captions (scripts/radar/transcript.py), never two within a minute, and nothing more after one refusal.
Prints what it did for each item and leaves the rest to the agents (who then write description-only entries).
"""
import json, os, re, subprocess, sys, time
from difflib import SequenceMatcher

RUN = sys.argv[1]
PY = '/Users/rado/code/ctrlai-tools/venv/bin/python'
items = [json.loads(l) for l in open(os.path.join(RUN, 'items.jsonl')) if l.strip()]
podcasts = [i for i in items if i.get('audio')]
triage = json.load(open(os.path.join(RUN, 'triage.json')))
groups = [g for gs in triage.get('deep', {}).values() for g in gs]

def norm(t): return re.sub(r'[^a-z0-9 ]', ' ', t.lower()).split()
def same_episode(video, pod):
    days = abs((time.mktime(time.strptime(video['published'][:10], '%Y-%m-%d')) - time.mktime(time.strptime(pod['published'][:10], '%Y-%m-%d'))) / 86400)
    if days > 3: return 0
    a, b = norm(video['title']), norm(pod['title'])
    return SequenceMatcher(None, a, b).ratio()

def run(cmd, timeout=7200):
    print('  $', ' '.join(c if len(c) < 80 else c[:77] + '…' for c in cmd), flush=True)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)

last_youtube, youtube_refused = 0.0, False
for g in groups:
    main = g['main']; also = g.get('also', [])
    out = os.path.join(RUN, 'sources', main['id'])
    if os.path.exists(out + '.txt'): print(f"{main['id']} already has text"); continue
    cands = [main] + also
    if not any(c.get('videoId') or c.get('audio') or c.get('transcripts') or c['kind'] in ('youtube', 'podcast') for c in cands): continue
    print(f"{main['id']} {main['title'][:80]}", flush=True)
    # 1. A transcript the publisher lists.
    tr = next((t for c in cands for t in c.get('transcripts', []) if t['type'] in ('text/plain', 'text/html', 'text/vtt')), None)
    if tr:
        r = run(['bash', 'scripts/fetch-text.sh', tr['url'], out + '.txt'])
        if r.returncode == 0: print('  publisher transcript saved'); continue
    # 2. Podcast audio: this item's, or the same episode in the podcast feeds.
    audio = next((c['audio'] for c in cands if c.get('audio')), None)
    if not audio:
        vids = [c for c in cands if c.get('videoId')]
        best = max(((same_episode(v, p), p) for v in vids for p in podcasts), default=(0, None), key=lambda x: x[0])
        if best[0] >= 0.6: audio = best[1]['audio']; print(f"  same episode in a podcast feed: {best[1]['title'][:70]} ({best[0]:.2f})")
    if audio:
        r = run([PY, '-I', 'scripts/radar/transcribe.py', audio, out, '--second', 'whisper'])
        print('  ' + (r.stdout.strip().splitlines() or ['(no output)'])[-1])
        if r.returncode == 0 and os.path.exists(out + '.txt'): continue
        print('  transcription failed: ' + r.stderr.strip()[-300:])
    # 3. YouTube captions, politely.
    vid = next((c['videoId'] for c in cands if c.get('videoId')), None)
    if vid and not youtube_refused:
        wait = 60 - (time.time() - last_youtube)
        if wait > 0: time.sleep(wait)
        r = run([PY, '-I', 'scripts/radar/transcript.py', vid, out])
        last_youtube = time.time()
        if r.returncode == 0: print('  ' + r.stdout.strip().splitlines()[-1]); continue
        youtube_refused = 'Blocked' in r.stderr or 'blocked' in r.stderr
        print('  captions failed' + (' (YouTube is refusing: no more caption requests this run)' if youtube_refused else '') + ': ' + r.stderr.strip()[-200:])
    print('  no text: the agent writes a description-only entry')
