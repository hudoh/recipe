import { NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Given recipe content scraped from a webpage, extract the recipe data and return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just the JSON):

{
  "name": "Recipe Name",
  "servings": number,
  "prep_time": "e.g. 15 min",
  "cook_time": "e.g. 45 min",
  "ingredients": [{"item": "ingredient name", "amount": "amount", "unit": "unit", "notes": "optional notes"}],
  "instructions": [{"step": "instruction step"}],
  "tags": ["tag1", "tag2"],
  "notes": "optional notes or tips"
}

Rules:
- Return ONLY the JSON object, nothing else
- If you can't extract a field, use a reasonable default or empty value
- servings should be a number
- ingredients should have item, amount, unit, notes fields
- instructions should be an array of {step} objects
- tags should be an array of strings`;

async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0; +mailto:admin@example.com)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('URL does not return HTML content');
  }

  return response.text();
}

function extractTextFromHtml(html: string): string {
  // Basic HTML text extraction - remove scripts, styles, and tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to extract just the recipe-relevant content using common recipe schema patterns
  // This is a simple approach - in production you'd want something more robust
  return text.slice(0, 15000); // Limit to 15k chars
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported' }, { status: 400 });
    }

    let html: string;
    try {
      html = await scrapeUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch URL';
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const pageText = extractTextFromHtml(html);

    if (!pageText || pageText.length < 50) {
      return NextResponse.json({ error: 'Could not extract readable content from this URL' }, { status: 422 });
    }

    // Use AI to extract recipe
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: `Extract the recipe from the following webpage content:\n\n${EXTRACTION_PROMPT}\n\nWebpage content:\n${pageText}` },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    let extracted: unknown;
    try {
      extracted = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Couldn't extract a recipe from this page. Please try entering it manually." }, { status: 422 });
    }

    return NextResponse.json({ data: extracted });
  } catch (error) {
    console.error('Extract from URL error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract recipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
