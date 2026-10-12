"""Turns a podcast episode's audio into a transcript with speaker turns, for the Radar and the archive.

Default: NVIDIA Nemotron ASR through OpenRouter (about a cent an hour; in the Oct 12 trial 6.7% word error against an
official transcript, local Whisper 8.8%). For any source we quote from, add `--second whisper`: a second, independent
transcript made on this Mac. compose.ts publishes a quotation from audio only if its words are in both.

  /Users/rado/code/ctrlai-tools/venv/bin/python -I scripts/radar/transcribe.py AUDIO_URL_OR_FILE OUT_BASE [--engine openrouter|whisper|elevenlabs] [--model OPENROUTER_MODEL] [--second whisper|openrouter]
      [--speakers N] [--names "names from the episode description"] [--diar TURNS.json (reuse speaker turns already computed)]

Writes OUT_BASE.transcript.json ({engine, generated, segments: [{start, end, text, speaker}]}) and OUT_BASE.txt, the
same shape scripts/radar/transcript.py writes for YouTube captions, so check-entry.ts, compose.ts and archive.ts read it
the same way. A change of speaker starts with ">>", which the quote checker treats as a turn: a quotation can't run from
one speaker into the next. Labels are S0, S1, … (whisper) or speaker_0, … (ElevenLabs): who they are is decided by a
person or an agent reading the introductions, never assumed.

  whisper     on this Mac: whisper.cpp (large-v3-turbo, Metal) + speaker turns from sherpa-onnx (pyannote + WeSpeaker). Free.
  elevenlabs  ElevenLabs Scribe v2 with diarization. Paid per audio hour; needs a key with the speech_to_text permission.
Audio is downloaded to a temporary folder and deleted afterwards: we keep the text, not the sound.
"""
import json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request

TOOLS = os.environ.get('CTRLAI_TOOLS', '/Users/rado/code/ctrlai-tools')
WHISPER_CLI = os.environ.get('WHISPER_CLI', shutil.which('whisper-cli') or '/opt/homebrew/bin/whisper-cli')
WHISPER_MODEL = os.environ.get('WHISPER_MODEL', f'{TOOLS}/models/ggml-large-v3-turbo-q5_0.bin')
DIAR = f'{TOOLS}/models/diarize'
UA = 'CtrlAIBot/0.1 (+https://ctrlai.com/about)'
# Names to expect, from the episode's own description only (never guessed): whisper spells them better when told.
PROMPT = ['--prompt', sys.argv[sys.argv.index('--names') + 1]] if '--names' in sys.argv else []

def fetch_audio(src, tmp):
    if os.path.exists(src): return src
    out = os.path.join(tmp, 'audio')
    req = urllib.request.Request(src, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(out, 'wb') as f: shutil.copyfileobj(r, f)
    return out

def to_wav(path, tmp):
    wav = os.path.join(tmp, 'audio.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav], check=True)
    return wav

def whisper(wav, tmp):
    """Words with their own start and end times, so each word can go to whoever was speaking at that moment."""
    base = os.path.join(tmp, 'whisper')
    subprocess.run([WHISPER_CLI, '-m', WHISPER_MODEL, '-f', wav, '-l', 'en', '-ojf', '-of', base, '-t', '8', '-np'] + PROMPT,
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    words = []
    for seg in json.load(open(base + '.json'))['transcription']:
        for tok in seg.get('tokens', []):
            t = tok.get('text', '')
            if not t or t.startswith('[_'): continue  # timestamps and other special tokens
            a, b = tok['offsets']['from'] / 1000, tok['offsets']['to'] / 1000
            if t.startswith(' ') or not words or re.match(r'^[A-Z0-9"(]', t) and words[-1]['text'].endswith(('.', '?', '!')):
                words.append({'start': a, 'end': b, 'text': t.strip()})
            else:  # a piece of the previous word, or punctuation
                words[-1]['text'] += t; words[-1]['end'] = b
    return [w for w in words if w['text']]

def diarize(wav, speakers=-1):
    import sherpa_onnx, soundfile as sf
    cfg = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=f'{DIAR}/sherpa-onnx-pyannote-segmentation-3-0/model.onnx'), num_threads=4),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=f'{DIAR}/wespeaker_en_voxceleb_resnet34_LM.onnx', num_threads=4),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=speakers, threshold=0.6),
        min_duration_on=0.3, min_duration_off=0.5)
    sd = sherpa_onnx.OfflineSpeakerDiarization(cfg)
    audio, sr = sf.read(wav, dtype='float32', always_2d=True)
    return [{'start': r.start, 'end': r.end, 'speaker': f'S{r.speaker}'} for r in sd.process(audio[:, 0]).sort_by_start_time()]

def label(words, turns):
    """Each word goes to the speaker turn its middle falls in (or the nearest turn); then words are grouped like ElevenLabs'."""
    j = 0
    for w in words:
        mid = (w['start'] + w['end']) / 2
        while j + 1 < len(turns) and turns[j]['end'] < mid: j += 1
        near = min(turns[max(0, j - 1):j + 2], key=lambda t: 0 if t['start'] <= mid <= t['end'] else min(abs(mid - t['start']), abs(mid - t['end'])), default=None)
        w['speaker_id'] = near['speaker'] if near else None
    return group(words)

def group(words):
    segs, cur = [], None
    for w in words:
        spk = w.get('speaker_id')
        # A new segment at each change of speaker, after a pause, or after a sentence of 30 words or more.
        if not cur or spk != cur['speaker'] or w['start'] - cur['end'] > 1.5 or (len(cur['text'].split()) >= 30 and re.search(r'[.?!]$', cur['text'])):
            cur = {'start': w['start'], 'end': w['end'], 'text': w['text'].strip(), 'speaker': spk}; segs.append(cur)
        else:
            cur['text'] += ('' if re.match(r'^[,.;:?!%)\]]', w['text']) else ' ') + w['text'].strip(); cur['end'] = w['end']
    return segs

def env_key(name):
    """A key from the environment or .env.local, never printed."""
    if os.environ.get(name): return os.environ[name]
    for env in ('.env.local', '../ctrlai-com/.env.local', '/Users/rado/code/ctrlai-com/.env.local'):
        if os.path.exists(env):
            m = re.search(rf'^{name}=["\']?([^"\'\n]+)', open(env).read(), re.M)
            if m: return m.group(1).strip()
    sys.exit(f'{name} is not set')

def openrouter(path, tmp, model):
    """A cloud transcriber through OpenRouter (default NVIDIA Nemotron ASR, about a cent an hour). Text only, no speakers:
    the audio goes up in 10-minute pieces, and each piece's times are shifted back into place."""
    key = env_key('OPENROUTER_API_KEY')
    words, offset, i = [], 0.0, 0
    total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)
    while offset < total:
        piece = os.path.join(tmp, f'piece{i}.mp3')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(offset), '-t', '600', '-i', path, '-ac', '1', '-ar', '16000', '-b:a', '64k', piece], check=True)
        import base64
        body = json.dumps({'model': model, 'input_audio': {'data': base64.b64encode(open(piece, 'rb').read()).decode(), 'format': 'mp3'},
                           'language': 'en', 'response_format': 'verbose_json'})
        req = urllib.request.Request('https://openrouter.ai/api/v1/audio/transcriptions', data=body.encode(),
                                     headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=600) as r: d = json.load(r)
        got = d.get('words') or []
        if got:
            words += [{'start': w['start'] + offset, 'end': w['end'] + offset, 'text': w.get('word', w.get('text', '')).strip()} for w in got]
        else:  # no word times from this provider: keep the segments, or the plain text as one piece
            for sgm in d.get('segments') or [{'start': 0, 'end': min(600, total - offset), 'text': d.get('text', '')}]:
                words.append({'start': sgm['start'] + offset, 'end': sgm['end'] + offset, 'text': sgm['text'].strip()})
        offset += 600; i += 1
    return [w for w in words if w['text']]

def elevenlabs(path):
    key = env_key('ELEVENLABS_API_KEY')
    out = subprocess.run(['curl', '-s', '-X', 'POST', 'https://api.elevenlabs.io/v1/speech-to-text', '-H', f'xi-api-key: {key}',
                          '-F', 'model_id=scribe_v2', '-F', f'file=@{path}', '-F', 'diarize=true', '-F', 'language_code=eng',
                          '-F', 'tag_audio_events=false', '-F', 'timestamps_granularity=word'], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    if 'words' not in d: sys.exit(f'ElevenLabs: {json.dumps(d)[:300]}')
    words = [w for w in d['words'] if w.get('type') != 'spacing' and w.get('text', '').strip()]
    segs = group(words)
    return segs, d

def write(segs, base, engine, meta):
    prev = None
    for s in segs:
        if s.get('speaker') != prev and prev is not None: s['text'] = '>> ' + s['text']
        prev = s.get('speaker')
    doc = {'engine': engine, 'generated': True, 'speakerLabels': any(s.get('speaker') for s in segs), **meta,
           'segments': [{'start': round(s['start'], 2), 'end': round(s['end'], 2), 'text': s['text'], 'speaker': s.get('speaker')} for s in segs]}
    json.dump(doc, open(base + '.transcript.json', 'w'), ensure_ascii=False)
    # Readable text: one paragraph per turn, with the label; the quote checker reads the segments instead.
    lines, cur = [], None
    for s in doc['segments']:
        t = s['text'][3:] if s['text'].startswith('>> ') else s['text']
        if cur is None or s['speaker'] != cur[0]: cur = [s['speaker'], s['start'], t]; lines.append(cur)
        else: cur[2] += ' ' + t
    with open(base + '.txt', 'w') as f:
        for spk, start, text in lines: f.write(f"[{int(start // 3600):02d}:{int(start % 3600 // 60):02d}:{int(start % 60):02d}] {spk or '?'}: {text}\n\n")
    return doc

if __name__ == '__main__':
    src, base = sys.argv[1], sys.argv[2]
    engine = sys.argv[sys.argv.index('--engine') + 1] if '--engine' in sys.argv else 'openrouter'
    speakers = int(sys.argv[sys.argv.index('--speakers') + 1]) if '--speakers' in sys.argv else -1
    tmp = tempfile.mkdtemp(prefix='ctrlai-stt-')
    try:
        t0 = time.time()
        path = fetch_audio(src, tmp)
        if engine == 'whisper':
            wav = to_wav(path, tmp)
            t1 = time.time(); segs = whisper(wav, tmp); t2 = time.time()
            turns = json.load(open(sys.argv[sys.argv.index('--diar') + 1]))['segments'] if '--diar' in sys.argv else diarize(wav, speakers)
            segs = label(segs, turns); t3 = time.time()
            meta = {'model': os.path.basename(WHISPER_MODEL), 'audio': src, 'seconds': {'whisper': round(t2 - t1), 'diarize': round(t3 - t2)}}
        elif engine == 'openrouter':
            model = sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else 'nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b'
            words = openrouter(path, tmp, model)
            # Speakers from this Mac when asked (--diar FILE or --speakers N), otherwise none.
            if '--diar' in sys.argv or '--speakers' in sys.argv:
                turns = json.load(open(sys.argv[sys.argv.index('--diar') + 1]))['segments'] if '--diar' in sys.argv else diarize(to_wav(path, tmp), speakers)
                segs = label(words, turns)
            else:
                segs = group(words)
            meta = {'model': model, 'audio': src, 'seconds': {'total': round(time.time() - t0)}}
        else:
            segs, _ = elevenlabs(path)
            meta = {'model': 'scribe_v2', 'audio': src, 'seconds': {'total': round(time.time() - t0)}}
        doc = write(segs, base, engine, meta)
        print(f"ok {engine}: {len(doc['segments'])} segments, {len({s['speaker'] for s in doc['segments']})} speakers, {round(time.time() - t0)}s → {base}.txt")
        # A second, independent transcript of the same audio. A quotation from this source is published only if its words
        # are in both (compose.ts checks), so one tool mishearing a word can't put it in someone's mouth.
        if '--second' in sys.argv:
            other = sys.argv[sys.argv.index('--second') + 1]
            t4 = time.time()
            if other == 'whisper': segs2 = group(whisper(to_wav(path, tmp), tmp))
            elif other == 'openrouter': segs2 = group(openrouter(path, tmp, 'nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b'))
            else: sys.exit(f'unknown --second {other}')
            write(segs2, base + '.second', other, {'audio': src, 'role': 'second opinion', 'seconds': {'total': round(time.time() - t4)}})
            print(f"ok second opinion ({other}) → {base}.second.txt")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
