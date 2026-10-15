# Running the daily Radar without approval prompts

The Radar runs unattended at 06:35. An approval prompt in an unattended run means nobody answers it: on October 14 the run
sat at one for four hours, and on October 15 for eight and a half. Before October 15 a run also needed 30 or more clicks.

## Why it asked so often

On October 15 the run and its 14 reading agents issued 132 shell commands, and 131 of them were one-off chains such as
`cd /Users/rado/code/ctrlai-com-radar && R=… && npx tsx scripts/radar/check-entry.ts $R/entries/x.json`. A permission rule
matches a command by its start, and a chain has to match piece by piece, so a rule saved from one click ("Always allow
`awk 'NR>150' 8ddab547591b.txt`") never matches the next day's different command. The project's `settings.local.json`
has 26 such rules, each useful once.

## What changed in the code

Everything the run needs from a shell now goes through one command, written out in full:

```
bash /Users/rado/code/ctrlai-com-radar/scripts/radar/rt.sh <tool> …
```

with tools `start`, `triage`, `prepare`, `fetch`, `check`, `lint`, `db`, `compose-dry` and `finish`. Reading and writing
files use Claude's own Read and Write tools, not `cat` and heredocs. The tools refuse anything unsafe: a path must be inside
`/Users/rado/code/ctrlai-archive/runs/`, a run must be a date, `db` is a single read-only SELECT, `fetch` takes only http(s).
So one rule can cover the run, and what it covers is narrow.

## What you add (once)

Permission rules are yours to change; these three cover the whole run. Add them to the `allow` list in
`/Users/rado/code/ctrlai/ctrlai-audit/.claude/settings.local.json` (the project the scheduled run starts in), or to
`~/.claude/settings.json`:

```json
"Bash(bash /Users/rado/code/ctrlai-com-radar/scripts/radar/rt.sh:*)",
"Write(~/code/ctrlai-archive/runs/**)",
"Edit(~/code/ctrlai-archive/runs/**)"
```

Reads already work: `/Users/rado/code` is one of your additional directories.

After the next run, `/fewer-permission-prompts` in a Claude session scans the transcripts and proposes any rule still
missing; it is the safe way to catch leftovers. The 26 one-off rules in the project file can be deleted.

## Why not "bypass permissions" for the scheduled run

The run reads untrusted text from the web all day and ends by pushing to `main`, which publishes ctrlai.com. In bypass mode
an instruction hidden in a fetched page could run any command. The three rules above keep the run's reach to its own tools
and its own run folders.
