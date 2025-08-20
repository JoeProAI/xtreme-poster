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

    // Get trending data for timely content with timeout
    let trendingContext = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const trendingResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/trending`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json();
        const relevantHashtags = trendingData.data.hashtags.slice(0, 5).join(', ');
        const relevantTopics = trendingData.data.topics.slice(0, 3).join(', ');
        trendingContext = `
CURRENT CONTEXT:
Hashtags: ${relevantHashtags}
Topics: ${relevantTopics}
Events: ${trendingData.data.currentEvents.slice(0, 2).join(', ')}
        `;
      }
    } catch (error) {
      console.log('Could not fetch trending data, proceeding without it');
    }

    // Impactful content generation with clear directives
    const prompt = `You are a commanding content creator who writes with authority and impact. Your voice cuts through noise with decisive clarity and moves people to action.

${trendingContext}

STYLE INSPIRATION: ${style}
Power elements: ${archetype.hooks.slice(0, 3).join(' | ')}
Impact structures: ${archetype.structures.slice(0, 2).join(' | ')}
Action triggers: ${archetype.ctas.slice(0, 2).join(' | ')}

TOPIC: "${topic}"
FORMAT: ${outputType}

IMPACT PRINCIPLES:
1. Lead with bold, definitive statements that demand attention
2. Use commanding language that creates urgency and momentum
3. Make clear, actionable directives - tell people exactly what to do
4. Build authority through confident assertions and insider knowledge
5. Create immediate value that people can act on right now
6. End with powerful calls-to-action that compel response
7. Use strong verbs and decisive language that cuts through hesitation
8. Speak with the confidence of someone who knows what works
9. Make every word count toward driving specific outcomes
10. Create content that moves people from passive reading to active engagement

DIRECTIVE LANGUAGE PATTERNS:
- "Here's what you need to know..."
- "Stop doing this. Start doing that."
- "The truth nobody talks about..."
- "Here's exactly how to..."
- "This changes everything..."
- "Do this now..."
- "The real reason why..."

For POSTS: Create a powerful statement that demands action or shifts perspective immediately
For THREADS: Build compelling arguments that lead to clear, actionable conclusions
For LONG-FORM: Develop authoritative insights with specific steps people can take

Write with the authority of someone who has answers, the clarity of someone who cuts through confusion, and the impact of someone who moves people to action. Be direct, be decisive, be unforgettable.`;

    try {
      console.log('Starting OpenAI completion...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });

      let content = completion.choices[0].message.content || '';
      let imageUrl = null;
      console.log('Content generated successfully');

      // Generate image if requested using GPT Image (with timeout)
      if (includeImage) {
        try {
          console.log('Starting image generation...');
          const imagePrompt = `Create a commanding visual that amplifies the impact of "${topic}". 

Visual directives:
- Bold, attention-grabbing composition that stops scrolling immediately
- High-contrast lighting that creates dramatic impact
- Strong color palette that conveys authority and urgency
- Clear, dominant focal point that demands attention
- Professional execution that builds credibility and trust
- Visual hierarchy that guides the eye to key elements
- Symbolic elements that reinforce the core message
- Dynamic composition that creates energy and movement
- Sharp details that reward closer examination
- Powerful aesthetic that projects confidence and expertise

Create an image that commands respect, builds authority, and compels people to take action on the content.`;

          // Add timeout for image generation
          const imageController = new AbortController();
          const imageTimeoutId = setTimeout(() => imageController.abort(), 15000); // 15 second timeout

          const imageResponse = await Promise.race([
            openai.responses.create({
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
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Image generation timeout')), 15000)
            )
          ]) as any;

          clearTimeout(imageTimeoutId);

          const imageData = imageResponse.output?.find((output: any) => output.type === "image_generation_call");
          if (imageData && 'result' in imageData) {
            imageUrl = `data:image/png;base64,${imageData.result}`;
            console.log('Image generated successfully');
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
        details: error instanceof Error ? error.message : 'Content generation timeout or API error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Request processing failed'
    }, { status: 500 });
  }
}