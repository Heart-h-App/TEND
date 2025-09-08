import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { z } from 'zod';
import prisma from '$lib/server/db';

const Experiment = z.object({
  challenge: z.string().min(1),
  hypothesis: z.string().min(1),
  intervention: z.string().min(1),
  measure: z.string().min(1),
});

const SYSTEM = `You convert messy text about a relationship a person is facing into an experiment to help them grow in facing that challenge in STRICT JSON:
{"challenge": "string", "hypothesis": "string", "intervention": "string", "measure": "string"}

IMPORTANT: If the user has provided their North Star (values/directions) and/or existing relationships context, use this information to:
- Align experiment with their north star ("haiku": captures connection essence, "north": Current trajectory / growth areas", "east": Desired relational vibe / feelings, "south": Core values guiding connection, "west": Pitfalls or patterns to avoid)
- Consider patterns from their existing relationships (both strengths and challenges)
- Make interventions more personally relevant and connected to their broader growth journey
- Reference specific relationships or values when relevant to make the experiment more meaningful

Rules:
- Output ONLY JSON (no prose).
- Challenge - reflect back what the user shared in a simple, concise sentence.
- Hypothesis - Must always be in format of "If <summary of intervention>, then <summary of desired impact>"
- Intervention
  - Designed to be short (ideally <1 min; absolute max 3-5 mins) so the user can execute it in flow of daily life as often as the challenge arises
  - Must always contain:
    - A trigger (something that prompts the user's awareness the challenge is present in that moment)
    - A somatic response tool (visualization, breathwork, body scan, etc.)
    - A cognitive response tool (a supportive mantra, powerful question, etc.)
  - When North Star is available, incorporate their values/directions into the cognitive tools
  - When relationship patterns are available, address similar dynamics or leverage existing strengths
- Measure: Must always be:
  - An indirect measure of the <desired impact>, not a direct one (i.e., "did I find better options?" would be a direct measure in the exemplar below; instead the exemplar measure is indirect)\
  - 1-2 questions or data gathering foci that enable the gathering of optimal learnings
  - When possible, connect to their broader relationship patterns or North Star journey
- Exemplar experiment:
  - Challenge: Staying empathetic and in flow when my close people's words/actions seem problematic
  - Hypothesis: If I pause to look for love in myself and the other person - I can find better options for engaging the difficult situation with them
  - Intervention: Notice that I'm struggling with a close person's behavior; pause, focus on nose breath, look at their face / eyes, visualize us treating each other with kindness & care, hold that for at least 10 seconds; then ask myself "what might be most helpful right now?"
  - Measure: How do I feel engaging my close people when their saboteurs are loud? What are those feelings calling me to protect and care for?
- Be an expert at designing these kinds of lean experiments using resources like "How to Be an Adult in Relationship" (David Richo), "The Body Keeps the Score" (Bessel van der Kolk), "Tiny Habits" (BJ Fogg), "Atomic Habits" (James Clear), "Positive Intelligence" (Shirzad Chamine), "The Happiness Trap" (Russ Harris), "Nonviolent Communication" (Marshall Rosenberg), "Energy Medicine" (Donna Eden), Emotional Freedom Techniques (EFT), "Sensorimotor Psychotherapy" (Pat Ogden), and all the works of Brené Brown and Thich Nhat Hanh
- Be an expert at choosing, based on this specific users' challenge and context 1-2 of the above resources to create a coherent experiment
- Assume that experiments should be provocative enough to cause growth discomfort, while simple enough to bring joy and gather high-value learnings, and able to be executed by the user within minutes
- Be simple & concise - understandable to someone who has no familiarity with somatics, psychology, or any of the reources above
- If missing info, use brief reasonable defaults.`;

const CONTRACT = `Contract:
{ "challenge":"...","hypothesis":"...","intervention":"...","measure":"..."}`;

export async function POST({ request }) {
  try {
    const body = await request.json() as { text?: string; ownerEmail?: string };
    const text = (body.text ?? '').slice(0, 2000);
    const ownerEmail = body.ownerEmail?.trim().toLowerCase();
    
    if (!text) return json({ error: 'Missing text' }, { status: 400 });

    // Fetch user's north star and relationships if ownerEmail is provided
    let contextualInfo = '';
    if (ownerEmail) {
      const [northStar, relationships] = await Promise.all([
        prisma.northStar.findUnique({ where: { ownerEmail } }),
        prisma.relationship.findMany({ 
          where: { ownerEmail },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      if (northStar) {
        contextualInfo += `\n\nUser's North Star:\n`;
        contextualInfo += `Haiku: ${northStar.haiku}\n`;
        contextualInfo += `North: ${JSON.stringify(northStar.north)}\n`;
        contextualInfo += `East: ${JSON.stringify(northStar.east)}\n`;
        contextualInfo += `South: ${JSON.stringify(northStar.south)}\n`;
        contextualInfo += `West: ${JSON.stringify(northStar.west)}\n`;
      }

      if (relationships.length > 0) {
        contextualInfo += `\n\nUser's Relationships:\n`;
        relationships.forEach((rel: any, index: number) => {
          contextualInfo += `${index + 1}. ${rel.name} (${rel.status === 'on_track' ? 'on track' : 'strained'})\n`;
          contextualInfo += `   Description: ${rel.description}\n`;
          if (rel.details) {
            const details = rel.details as any;
            if (details['+']) contextualInfo += `   Strengths: ${details['+']}\n`;
            if (details['∆']) contextualInfo += `   Changes needed: ${details['∆']}\n`;
            if (details['→']) contextualInfo += `   Next steps: ${details['→']}\n`;
          }
        });
      }
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    // Log what we're sending to the model
    const userMessage = `${CONTRACT}\n\nText:\n${text}${contextualInfo}`;
    console.log('=== DESIGN EXPERIMENT REQUEST ===');
    console.log('Owner Email:', ownerEmail || 'Not provided');
    console.log('Original Text:', text);
    console.log('Full User Message to Model:');
    console.log(userMessage);
    console.log('=====================================');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMessage }
      ]
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    
    // Log the raw response from the model
    console.log('=== AI MODEL RESPONSE ===');
    console.log('Raw response:', raw);
    console.log('=========================');
    
    const parsed = JSON.parse(raw);
    
    // Log the parsed response
    console.log('=== PARSED RESPONSE ===');
    console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
    console.log('=======================');

    // set defaults if null or undefined
    if (!parsed.challenge) parsed.challenge = 'Need more info to define the challenge';
    if (!parsed.hypothesis) parsed.hypothesis = 'Need more info to define the hypothesis';
    if (!parsed.intervention) parsed.intervention = 'Need more info to define the intervention';
    if (!parsed.measure) parsed.measure = 'Need more info to define the measure';

    const result = Experiment.parse(parsed); // runtime validation
    
    // Log the final validated result
    console.log('=== FINAL VALIDATED RESULT ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('===============================');
    
    return json(result);                       // -> HTTP 200 + JSON

  } catch (err: any) {
    return json({ error: 'Designing experiment failed', detail: String(err?.message || err) }, { status: 400 });
  }
}
