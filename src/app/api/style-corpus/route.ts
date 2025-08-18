import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Try multiple possible paths for the style_corpus.json file
    const possiblePaths = [
      join(process.cwd(), 'style_corpus.json'),
      join(process.cwd(), '..', 'style_corpus.json'),
      join(process.cwd(), '..', '..', 'style_corpus.json'),
    ];
    
    let data;
    let fileContents;
    
    for (const filePath of possiblePaths) {
      try {
        fileContents = readFileSync(filePath, 'utf8');
        data = JSON.parse(fileContents);
        break;
      } catch (err) {
        // Continue to next path
        continue;
      }
    }
    
    if (!data) {
      throw new Error('Could not find style_corpus.json in any expected location');
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading style_corpus.json:', error);
    return NextResponse.json(
      { error: 'Failed to load style corpus data' },
      { status: 500 }
    );
  }
}
