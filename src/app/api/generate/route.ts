import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';
import { formatPost, formatThread, formatLongForm } from './post-processing';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define a type for our style corpus
type StyleCorpus = {
  archetypes: {
    [key: string]: {
      hooks: string[];
      structures: string[];
      ctas: string[];
    };
  };
};

async function getStyleCorpus(): Promise<StyleCorpus> {
  const jsonPath = path.resolve(process.cwd(), 'style_corpus.json');
  const jsonData = await fs.readFile(jsonPath, 'utf-8');
  return JSON.parse(jsonData);
}

export async function POST(req: Request) {
  const { topic, style, outputType } = await req.json();
  const styleCorpus = await getStyleCorpus();

  const archetype = styleCorpus.archetypes[style];

  if (!archetype) {
    return NextResponse.json({ error: 'Invalid style selected' }, { status: 400 });
  }

  // Construct a more detailed prompt
  const prompt = `
    Generate a ${outputType} about "${topic}".
    The style should be "${style}".
    Use one of these hooks: ${archetype.hooks.join(', ')}
    Follow this structure: ${archetype.structures.join(', ')}
    Include a call to action like one of these: ${archetype.ctas.join(', ')}
    Ensure the output is natural and avoids AI-like grammar and phrasing.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
    });

    let content = completion.choices[0].message.content || '';

    if (outputType === 'post') {
      content = formatPost(content);
    } else if (outputType === 'thread') {
      content = formatThread(content);
    } else {
      content = formatLongForm(content);
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}