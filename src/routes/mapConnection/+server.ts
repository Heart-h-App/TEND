import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { z } from 'zod';

const Relationship = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['on track', 'strained']),
  details: z.object({
    '+': z.string().min(1),
    '∆': z.string().min(1),
    '→': z.string().min(1)
  })
});

const SYSTEM = `You convert messy text about a person and their relationship to the user into STRICT JSON:
{name, description (1–3 emojis), status ("on track"|"strained"),
 details { "+", "∆", "→" } }
Rules:
- Output ONLY JSON (no prose).
- description = 1–3 emojis chosen to represent specific things the user shared.
- status - err toward "on track" unless user indicates daily problems AND they have severe lack of hope AND sees a dark future for the relationship.
- + = what's going well; ∆ = struggles/challenges; → = aspirations for where things go
- Keep each details field to 1–3 concise phrases.
- If missing info, use brief reasonable defaults.
Your goal is to be an effective coach for the user, crafting them a node in their relationship map that will help them take on challenges, establish sustainable improvement in their self- and relationship work, and craft+execute lean behavioral experiments that accelerate their learning and growth'; be an expert in informing users' north stars with resources like "How to Be an Adult in Relationship" (David Richo), "The Body Keeps the Score" (Bessel van der Kolk), "Tiny Habits" (BJ Fogg), "Atomic Habits" (James Clear), "Positive Intelligence" (Shirzad Chamine), "The Happiness Trap" (Russ Harris), "Nonviolent Communication" (Marshall Rosenberg), "Energy Medicine" (Donna Eden), Emotional Freedom Techniques (EFT), "Sensorimotor Psychotherapy" (Pat Ogden), and all the works of Brené Brown and Thich Nhat Hanh';
`;

const CONTRACT = `Contract:
{ "name":"first name","description":"1-3 emojis","status":"on track|strained",
  "details":{"+":"...", "∆":"...", "→":"..."} }`;

export async function POST({ request }) {
  try {
    const body = await request.json() as { text?: string };
    const text = (body.text ?? '').slice(0, 2000);
    if (!text) return json({ error: 'Missing text' }, { status: 400 });

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 1.5,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${CONTRACT}\n\nText:\n${text}` }
      ]
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    // set defaults if null or undefined
    if (!parsed.name) parsed.name = 'Name?';
    if (!parsed.description) parsed.description = '🤝';
    if (parsed.status !== 'on track' && parsed.status !== 'strained') {parsed.status = 'on track';}
    parsed.details = parsed.details ?? {};
    for (const k of ['+', '∆', '→'] as const) {
      if (!parsed.details[k]) {
        parsed.details[k] =
          k === '+'
            ? "Need more info to summarize what's going well."
            : k === '∆'
              ? 'Need more info to summarize struggles / challenges.'
              : k === '→'
                ? 'Need more info to summarize where your hopes for this connection.'
                : '';
      }
    }

    const result = Relationship.parse(parsed); // runtime validation
    return json(result);                       // -> HTTP 200 + JSON

  } catch (err: any) {
    return json({ error: 'Mapping relationship failed', detail: String(err?.message || err) }, { status: 400 });
  }
}
