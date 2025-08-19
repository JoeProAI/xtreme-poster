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

    // Get trending data for timely content
    let trendingContext = '';
    try {
      const trendingResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/trending`);
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json();
        const relevantHashtags = trendingData.data.hashtags.slice(0, 5).join(', ');
        const relevantTopics = trendingData.data.topics.slice(0, 3).join(', ');
        trendingContext = `
        TRENDING NOW (use these for maximum relevance):
        - Hot hashtags: ${relevantHashtags}
        - Trending topics: ${relevantTopics}
        - Current events context: ${trendingData.data.currentEvents.slice(0, 2).join(', ')}
        `;
      }
    } catch (error) {
      console.log('Could not fetch trending data, proceeding without it');
    }

    // Enhanced prompt for viral X/Twitter content with trending context
    const prompt = `
      Generate a viral ${outputType} about "${topic}" optimized for maximum X/Twitter impressions.
      Style: "${style}"
      
      ${trendingContext}
      
      Use viral techniques:
      - Hook: ${archetype.hooks.join(', ')}
      - Structure: ${archetype.structures.join(', ')}
      - CTA: ${archetype.ctas.join(', ')}
      
      Make it EXTREMELY timely and on-point:
      • Reference current trending topics when relevant
      • Use trending hashtags naturally
      • Connect to breaking news or viral moments
      • Include real-time cultural references
      • Make it feel like it was written TODAY
      • Use emotional triggers and controversy
      • Include numbers/statistics when possible
      • Make it copy-paste ready for X/Twitter
      • Use MINIMAL emoticons (max 1-2 per post)
      • NEVER use dash characters (-)
      • Keep formatting clean and professional
      
      The content should feel urgent, timely, and perfectly aligned with what's happening RIGHT NOW.
      Format for easy copying to X/Twitter with clean, professional appearance.
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
          // Create detailed, unique image prompt
          const imagePrompt = `Create a stunning, highly detailed visual artwork about "${topic}" in ${style} style. 

          Visual Elements:
          • Ultra-realistic 8K quality with cinematic lighting
          • Dynamic composition with rule of thirds
          • Rich color palette with complementary contrasts
          • Professional photography aesthetic with shallow depth of field
          • Incorporate trending visual metaphors and symbols
          • Modern, sleek design with premium feel
          • Subtle texture overlays and atmospheric effects
          • Perfect for social media engagement

          Technical Specifications:
          • Photorealistic rendering with HDR lighting
          • Sharp focus on main subject with artistic bokeh background
          • Vibrant but sophisticated color grading
          • Clean, uncluttered composition
          • High contrast and visual impact
          • Professional studio lighting setup
          • Trending aesthetic that stops scrolling

          Make it visually striking, unique, and instantly shareable on X/Twitter.`;

          const imageResponse = await openai.responses.create({
            model: "gpt-4o",
            input: imagePrompt,
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