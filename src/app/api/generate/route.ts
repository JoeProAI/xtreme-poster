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
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('OpenAI client initialized:', !!openai);
    
    if (!openai) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
        debug: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          clientInitialized: !!openai
        }
      }, { status: 500 });
    }

    const { topic, style, outputType, includeImage } = await req.json();
    console.log('Request data:', { topic, style, outputType, includeImage });
    
    const styleCorpus = await getStyleCorpus();
    console.log('Style corpus loaded successfully');

    const archetype = styleCorpus.archetypes[style];

    if (!archetype) {
      return NextResponse.json({ error: 'Invalid style selected' }, { status: 400 });
    }

    // Enhanced prompt for viral X/Twitter content
    const prompt = `
      Generate a viral ${outputType} about "${topic}" optimized for maximum X/Twitter impressions.
      Style: "${style}"
      
      Use viral techniques:
      - Hook: ${archetype.hooks.join(', ')}
      - Structure: ${archetype.structures.join(', ')}
      - CTA: ${archetype.ctas.join(', ')}
      
      Make it:
      - Highly engaging and shareable
      - Include trending hashtags
      - Use emotional triggers
      - Add controversy or strong opinions when appropriate
      - Include numbers/statistics when possible
      - Make it copy-paste ready for X/Twitter
      
      Format for easy copying to X/Twitter.
    `;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
      });

      let content = completion.choices[0].message.content || '';
      let imageUrl = null;

      // Generate image if requested using GPT Image
      if (includeImage) {
        try {
          const imageResponse = await openai.responses.create({
            model: "gpt-4o",
            input: `Create a viral, eye-catching image for X/Twitter about: ${topic}. Style: ${style}. Make it engaging and shareable with high visual impact.`,
            tools: [
              {
                type: "image_generation",
                quality: "high",
                size: "1024x1024",
                background: "auto"
              }
            ]
          });

          const imageData = imageResponse.output?.find(
            (output) => output.type === "image_generation_call"
          );

          if (imageData && 'result' in imageData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            imageUrl = `data:image/png;base64,${(imageData as any).result}`;
          }
        } catch (imageError) {
          console.error('GPT Image generation error:', imageError);
          // Continue without image if generation fails
        }
      }

      if (outputType === 'post') {
        content = formatPost(content);
      } else if (outputType === 'thread') {
        content = formatThread(content);
      } else {
        content = formatLongForm(content);
      }

      return NextResponse.json({ 
        content,
        image: imageUrl,
        copyReady: true
      });
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