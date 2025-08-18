import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read the style_corpus.json file from the project root
    const filePath = join(process.cwd(), '..', '..', 'style_corpus.json');
    const fileContents = readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading style_corpus.json:', error);
    return NextResponse.json(
      { error: 'Failed to load style corpus data' },
      { status: 500 }
    );
  }
}
