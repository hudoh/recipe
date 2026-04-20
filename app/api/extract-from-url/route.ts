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
  "servings": number or null,
  "prep_time": "e.g. 15 min" or null,
  "cook_time": "e.g. 45 min" or null,
  "ingredients": [{"item": "ingredient name", "amount": "amount as written" or null, "unit": "unit as written" or null, "notes": "optional notes" or null}],
  "instructions": [{"step": "exact instruction text from the recipe"}],
  "tags": ["tag1", "tag2"] or null,
  "notes": "optional notes from recipe" or null
}

Rules:
- Return ONLY the JSON object, nothing else
- Copy ingredient amounts and units EXACTLY as written — do not convert, simplify, or rephrase them (e.g., keep \"1/2 cup\" as \"1/2 cup\", not \"4 oz\" or \"1 stick\")
- Copy instruction text EXACTLY as written — do not paraphrase, expand abbreviations, or rephrase
- If a field cannot be determined from the page, use null — do NOT guess or invent values
- servings should be a number if detected, null if not found
- ingredients should have item, amount, unit, notes fields
- instructions should be an array of {step} objects
- tags should be an array of lowercase strings or null
- Do not add, combine, split, or modify any ingredient or instruction`

async function tryApify(url: string): Promise<string | null> {
  const apifyKey = process.env.APIFY_API_KEY;
  if (!apifyKey) return null;

  try {
    // Use Apify's sync endpoint - waits for results and returns dataset items
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~website-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl: url }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      console.log(`Apify returned ${response.status}`);
      return null;
    }

    const items = await response.json() as Array<{
      text?: string;
      html?: string;
      url?: string;
    }>;

    if (items && items.length > 0) {
      // Prefer text content, fall back to html
      const pageContent = items[0]?.text || items[0]?.html || '';
      if (pageContent && pageContent.length > 100) {
        console.log('Apify scraped successfully');
        return `<html><body>${pageContent}</body></html>`;
      }
    }
  } catch (e) {
    console.log('Apify failed:', e instanceof Error ? e.message : e);
  }

  return null;
}

async function scrapeUrl(url: string): Promise<string> {
  // Try local browser scraper first (MacBook Air via ngrok)
  const scraperBase = process.env.SCRAPER_BASE_URL;
  if (scraperBase) {
    try {
      const scraperUrl = `${scraperBase}/scrape?url=${encodeURIComponent(url)}`;
      const scraperResponse = await fetch(scraperUrl, { signal: AbortSignal.timeout(45000) });
      if (scraperResponse.ok) {
        const html = await scraperResponse.text();
        if (html && html.length > 100) {
          return html;
        }
      }
    } catch (e) {
      console.log('Local scraper unavailable:', e instanceof Error ? e.message : e);
    }
  }

  // First try with realistic browser headers
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    },
  });

  // Check if the site blocked us (including 402 Payment Required from bot detection)
  if (response.status === 403 || response.status === 406 || response.status === 429 || response.status === 402) {
    // Try Apify as primary cloud scraper (reliable headless browser)
    const apifyHtml = await tryApify(url);
    if (apifyHtml) {
      return apifyHtml;
    }

    // Try Firecrawl as secondary fallback
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (firecrawlKey) {
      const firecrawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, formats: ['markdown'] }),
      });

      if (!firecrawlResponse.ok) {
        if (firecrawlResponse.status === 402 || firecrawlResponse.status === 403) {
          throw new Error('FIRECRAWL_UNAVAILABLE');
        }
        throw new Error(`Firecrawl error: ${firecrawlResponse.status} ${firecrawlResponse.statusText}`);
      }

      const firecrawlData = await firecrawlResponse.json() as {
        data?: { markdown?: string };
        error?: string;
      };
      if (firecrawlData.data?.markdown) {
        return `<html><body><p>${firecrawlData.data.markdown}</p></body></html>`;
      }
      if (firecrawlData.error) {
        throw new Error(`Firecrawl error: ${firecrawlData.error}`);
      }
    }

    // If we get here, all cloud scrapers failed
    throw new Error('BLOCKED');
  }

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
      if (message === 'BLOCKED') {
        return NextResponse.json(
          { error: "This site blocks automated access. Try copying the recipe text manually instead." },
          { status: 422 }
        );
      }
      if (message === 'FIRECRAWL_UNAVAILABLE') {
        return NextResponse.json(
          { error: "AI extraction requires a Firecrawl API key (free at firecrawl.dev) or credits. Add FIRECRAWL_API_KEY to Vercel env vars, or enter the recipe manually." },
          { status: 422 }
        );
      }
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

    const data = extracted as Record<string, unknown>;
    // Append source URL to notes
    data.notes = ((data.notes as string) || '') + '\n\nSource: ' + url;

    return NextResponse.json({ data, sourceUrl: url });
  } catch (error) {
    console.error('Extract from URL error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract recipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
