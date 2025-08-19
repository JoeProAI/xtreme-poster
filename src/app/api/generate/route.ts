import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';
import { formatPost, formatThread, formatLongForm } from './post-processing';

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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
  try {
    // Debug: Log environment variable status
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('OpenAI client initialized:', !!openai);
    
    // Check if OpenAI client is available
    if (!openai) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
        debug: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          clientInitialized: !!openai
        }
      }, { status: 500 });
    }

    const { topic, style, outputType } = await req.json();
    console.log('Request data:', { topic, style, outputType });
    
    const styleCorpus = await getStyleCorpus();
    console.log('Style corpus loaded successfully');

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
      console.error('OpenAI API error:', error);
      return NextResponse.json({ 
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}