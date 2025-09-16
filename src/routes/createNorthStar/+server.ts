import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { z } from 'zod';

const Item = z.object({
  emoji: z.string().min(1),
  phrase: z.string().min(1)
});

const NorthStar = z.object({
  haiku: z.string().min(1),
  north: z.array(Item),
  east: z.array(Item),
  south: z.array(Item),
  west: z.array(Item)
});

const SYSTEM = `You convert messy text about someone's connection aspirations into a structured North Star format in STRICT JSON:
{haiku, north, east, south, west}

Rules:
- Output ONLY JSON (no prose).
- haiku = 3-line poem (5-7-5 syllables) capturing their connection essence
- north/east/south/west = arrays of {emoji, phrase} objects (2-4 items each)
- north = Current trajectory / growth areas
- east = Desired relational vibe / feelings 
- south = Core values guiding connections
- west = Pitfalls or patterns to avoid
- Each phrase should be 3-8 words, actionable and specific
- Choose emojis that meaningfully represent each concept
Your goal is to be an effective coach for the user, crafting them a north star that will help them take on challenges, establish sustainable improvement in their self- and relationship work, and craft+execute lean behavioral experiments that accelerate their learning and growth'; be an expert in informing users' north stars with resources like "How to Be an Adult in Relationship" (David Richo), "The Body Keeps the Score" (Bessel van der Kolk), "Tiny Habits" (BJ Fogg), "Atomic Habits" (James Clear), "Positive Intelligence" (Shirzad Chamine), "The Happiness Trap" (Russ Harris), "Nonviolent Communication" (Marshall Rosenberg), "Energy Medicine" (Donna Eden), Emotional Freedom Techniques (EFT), "Sensorimotor Psychotherapy" (Pat Ogden), and all the works of Brené Brown and Thich Nhat Hanh
`;

const CONTRACT = `Contract:
{ "haiku":"3-line poem\\n5-7-5 syllables\\nabout connection", 
  "north":[{"emoji":"🌟","phrase":"trajectory / growth area"},...],
  "east":[{"emoji":"🌱","phrase":"vibe / feeling"},...],
  "south":[{"emoji":"🌊","phrase":"core value"},...],
  "west":[{"emoji":"🤝","phrase":"pitfall / anti-pattern"},...] }`;

export async function POST({ request }) {
  try {
    const body = await request.json() as { visionText?: string; currentText?: string };
    const visionText = (body.visionText ?? '').slice(0, 1500);
    const currentText = (body.currentText ?? '').slice(0, 1500);
    if (!visionText || !currentText) return json({ error: 'Missing vision or current text' }, { status: 400 });

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 1.5,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${CONTRACT}\n\nVision: ${visionText}\n\nCurrent State: ${currentText}` }
      ]
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    // Set defaults if missing
    if (!parsed.haiku) parsed.haiku = 'Connection flows\\nThrough authentic presence\\nHearts open to growth';
    
    for (const direction of ['north', 'east', 'south', 'west'] as const) {
      if (!Array.isArray(parsed[direction])) {
        parsed[direction] = [{ emoji: '🤔', phrase: 'Need more clarity here' }];
      }
      // Ensure each item has emoji and phrase
      parsed[direction] = parsed[direction].map((item: any) => ({
        emoji: item?.emoji || '🤔',
        phrase: item?.phrase || 'Need more info'
      }));
    }

    const result = NorthStar.parse(parsed); // runtime validation
    return json(result);

  } catch (err: any) {
    return json({ error: 'North Star generation failed', detail: String(err?.message || err) }, { status: 400 });
  }
}