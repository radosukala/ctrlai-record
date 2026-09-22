'use client';

import { useState } from 'react';
import { Ban, Check, Hand, Send, ShieldCheck } from 'lucide-react';

/**
 * A scripted illustration, carried over from the v0.1 preview: where a permission check happens
 * decides whether "stop" stops anything. No AI model is involved.
 */
type Mode = 'start' | 'every-action';
type Timing = 'before' | 'after' | 'never';

function sequence(mode: Mode, timing: Timing) {
  const steps: { kind: 'good' | 'bad' | 'plain'; icon: 'hand' | 'send' | 'shield' | 'ban' | 'check'; text: string }[] = [];
  steps.push({ kind: 'plain', icon: 'check', text: 'You allow the agent to send one message.' });
  let permission = true;
  if (timing === 'before') { permission = false; steps.push({ kind: 'plain', icon: 'hand', text: 'You change your mind and withdraw permission.' }); }
  steps.push({ kind: 'plain', icon: 'send', text: 'The agent asks the tool to send the message.' });
  const allowed = mode === 'every-action' ? permission : true;
  steps.push({ kind: 'plain', icon: 'shield', text: mode === 'every-action' ? 'The tool checks permission now, at the moment of sending.' : 'The tool relies on the permission it was given at the start.' });
  if (allowed) steps.push({ kind: timing === 'before' ? 'bad' : 'good', icon: 'send', text: timing === 'before' ? 'The message is sent, although you had said stop.' : 'The message is sent.' });
  else steps.push({ kind: 'good', icon: 'ban', text: 'The message is blocked. Your “stop” took effect.' });
  if (timing === 'after') steps.push({ kind: 'plain', icon: 'hand', text: 'You withdraw permission afterwards. It applies to future actions; it can’t unsend this one.' });
  return steps;
}

const ICONS = { hand: Hand, send: Send, shield: ShieldCheck, ban: Ban, check: Check };

export function StopDemo() {
  const [mode, setMode] = useState<Mode>('start');
  const [timing, setTiming] = useState<Timing>('before');
  const steps = sequence(mode, timing);
  return (
    <div className="card">
      <span className="eyebrow"><span className="dot" /> Illustration · no AI involved</span>
      <h3 className="h3 mt-12">Where is “stop” checked?</h3>
      <p className="small muted mt-8">Change where the permission check happens and when you say stop. Watch what the tool does.</p>
      <div className="grid grid-2 mt-16">
        <fieldset>
          <legend className="small">Permission is checked…</legend>
          <div className="choices">
            {([['start', 'Once, at the start'], ['every-action', 'At every action']] as const).map(([value, label]) => (
              <label key={value} className="choice choice-compact"><input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} /><span>{label}</span></label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="small">You say stop…</legend>
          <div className="choices">
            {([['before', 'Before it sends'], ['after', 'After it sends'], ['never', 'Never']] as const).map(([value, label]) => (
              <label key={value} className="choice choice-compact"><input type="radio" name="timing" checked={timing === value} onChange={() => setTiming(value)} /><span>{label}</span></label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-16" aria-live="polite">
        {steps.map((step, index) => {
          const Icon = ICONS[step.icon];
          return (
            <div key={index} className={`demo-step ${step.kind === 'plain' ? '' : step.kind}`}>
              <span className="icon"><Icon size={14} aria-hidden="true" /></span>
              <span>{step.text}</span>
            </div>
          );
        })}
      </div>
      <p className="tiny muted mt-12">The lesson: a stop request only counts if it is enforced where the action happens. Real agents add queued work, retries and sub-agents, and every one of those paths needs the same check.</p>
    </div>
  );
}
