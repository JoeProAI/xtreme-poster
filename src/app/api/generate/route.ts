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
CURRENT CONTEXT:
Hashtags: ${relevantHashtags}
Topics: ${relevantTopics}
Events: ${trendingData.data.currentEvents.slice(0, 2).join(', ')}
        `;
      }
    } catch (error) {
      console.log('Could not fetch trending data, proceeding without it');
    }

    // Authentic content generation prompt focused on quality writing
    const prompt = `You are a skilled writer who creates compelling social media content. Your voice is authentic, thoughtful, and naturally engaging without being pushy or salesy.

${trendingContext}

STYLE INSPIRATION: ${style}
Writing elements: ${archetype.hooks.slice(0, 3).join(' | ')}
Structure options: ${archetype.structures.slice(0, 2).join(' | ')}

TOPIC: "${topic}"
FORMAT: ${outputType}

WRITING PRINCIPLES:
1. Write with genuine voice - no marketing speak or hype
2. Use concrete imagery and specific details over abstract concepts  
3. Lead with curiosity, insight, or authentic observation
4. Weave trending elements naturally into the narrative
5. Choose precise words that carry weight and meaning
6. Create moments of recognition or revelation for readers
7. Build tension through pacing and word choice
8. End with something that lingers in the mind
9. Use minimal emojis (max 2) and replace dashes with bullets (•)
10. Write like you're sharing something that genuinely matters to you

For POSTS: Craft a single, memorable statement that captures attention through insight or observation
For THREADS: Build a narrative arc that unfolds naturally across connected thoughts  
For LONG-FORM: Develop ideas with depth, using vivid language and thoughtful progression

Write content that feels real, sounds intelligent, and connects with people on a human level. Avoid buzzwords, excessive enthusiasm, or anything that sounds like it's trying to sell something.`;

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
          // Generate thoughtful image prompt that complements the content
          const imagePrompt = `Create a compelling visual that enhances the message about "${topic}". 

Visual approach:
- Clean, sophisticated composition with purposeful elements
- Natural lighting that feels authentic and inviting  
- Thoughtful color palette that supports the mood
- Clear focal point with balanced negative space
- Professional quality without over-processing
- Genuine aesthetic that feels human and relatable
- Visual metaphors that add depth to the concept
- Composition that draws the eye naturally
- Subtle details that reward closer inspection
- Timeless quality that won't feel dated quickly

Create an image that people connect with emotionally and want to engage with because it genuinely adds value to the content.`;

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

          const imageData = imageResponse.output?.find(output => output.type === "image_generation_call");
          if (imageData && 'result' in imageData) {
            imageUrl = `data:image/png;base64,${imageData.result}`;
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