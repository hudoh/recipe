import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseRecipeHtml } from '@/lib/recipe-parser';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Minimal AI pass: takes already-parsed ingredient and instruction strings,
 * asks the model to ONLY format them as JSON — not interpret or modify.
 * This is a safety net for sites without JSON-LD; the cheerio parser above
 * handles the actual extraction.
 */
const FORMAT_PROMPT = `You are a recipe formatter. The user will provide a list of ingredient lines and instruction lines copied directly from a recipe webpage. Your ONLY job is to format them as JSON — do NOT interpret, convert, simplify, expand, or correct any of the content. Preserve every word exactly as provided.

Return a valid JSON object with this exact structure:
{
  "name": "Recipe Name" or null,
  "servings": number or null,
  "prep_time": "string" or null,
  "cook_time": "string" or null,
  "ingredients": [{"item": "ingredient name", "amount": "amount string as given" or null, "unit": "unit string as given" or null, "notes": "notes" or null}],
  "instructions": [{"step": "exact instruction text"}],
  "tags": ["tag"] or null,
  "notes": "string" or null
}

CRITICAL RULES:
- Copy every ingredient line EXACTLY as given — do not modify amounts, units, or wording
- Copy every instruction step EXACTLY as given — do not paraphrase or rephrase
- Do not combine, split, or change any ingredient or instruction
- If something is unclear or missing, use null — do NOT guess
- Return ONLY the JSON object, nothing else before or after`;

async function tryApify(url: string): Promise<string | null> {
  const apifyKey = process.env.APIFY_API_KEY;
  if (!apifyKey) return null;

  try {
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
    }>;

    if (items && items.length > 0) {
      const pageContent = items[0]?.text || items[0]?.html || '';
      if (pageContent && pageContent.length > 100) {
        return `<html><body>${pageContent}</body></html>`;
      }
    }
  } catch (e) {
    console.log('Apify failed:', e instanceof Error ? e.message : e);
  }

  return null;
}

async function scrapeUrl(url: string): Promise<string> {
  // Try local browser scraper first
  const scraperBase = process.env.SCRAPER_BASE_URL;
  if (scraperBase) {
    try {
      const scraperResponse = await fetch(
        `${scraperBase}/scrape?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(45000) }
      );
      if (scraperResponse.ok) {
        const html = await scraperResponse.text();
        if (html && html.length > 100) return html;
      }
    } catch (e) {
      console.log('Local scraper unavailable:', e instanceof Error ? e.message : e);
    }
  }

  // Direct fetch with browser headers
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    },
  });

  if (response.status === 403 || response.status === 406 || response.status === 429 || response.status === 402) {
    const apifyHtml = await tryApify(url);
    if (apifyHtml) return apifyHtml;

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
        throw new Error(`Firecrawl error: ${firecrawlResponse.status}`);
      }

      const firecrawlData = await firecrawlResponse.json() as {
        data?: { markdown?: string };
        error?: string;
      };
      if (firecrawlData.data?.markdown) {
        return `<html><body><p>${firecrawlData.data.markdown}</p></body></html>`;
      }
    }

    throw new Error('BLOCKED');
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new Error('URL does not return HTML content');
  }

  return response.text();
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
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

    // Use cheerio to extract structured data (JSON-LD first, DOM fallback)
    const parsed = parseRecipeHtml(html);

    let data: Record<string, unknown>;

    if (parsed.ingredients.length >= 2 && parsed.instructions.length >= 2) {
      // Cheerio got structured data — format it directly without AI inference
      data = {
        name: parsed.name,
        servings: parsed.servings,
        prep_time: parsed.prep_time,
        cook_time: parsed.cook_time,
        ingredients: parsed.ingredients.map((item) => {
          // Parse "1 1/2 cups flour" into amount/unit/item
          const match = item.match(/^([\d\s\/.\-]+)?\s*(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|kg|ml|liters?|cloves?|stalks?|sprigs?|pinch|dash|small|medium|large|whole|half)?\s+(.+)$/i);
          if (match) {
            return {
              item: match[3].trim(),
              amount: match[1]?.trim() ?? null,
              unit: match[2]?.trim() ?? null,
              notes: null,
            };
          }
          return { item, amount: null, unit: null, notes: null };
        }),
        instructions: parsed.instructions.map((step) => ({ step })),
        tags: parsed.tags,
        notes: parsed.notes,
      };
    } else {
      // Fall back to AI extraction with strict formatting-only prompt
      // Strip HTML and send clean text to AI
      const { load: cheerioLoad } = await import('cheerio');
      const $ = cheerioLoad(html);
      const pageText = $('body').text()
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000);

      if (!pageText || pageText.length < 50) {
        return NextResponse.json(
          { error: 'Could not extract readable content from this URL' },
          { status: 422 }
        );
      }

      const aiResponse = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: FORMAT_PROMPT },
          { role: 'user', content: `Format this recipe webpage content as JSON. Copy all ingredient lines and instruction steps EXACTLY as written — do not modify any amount, unit, or wording:\n\n${pageText}` },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      });

      const content = aiResponse.choices[0]?.message?.content?.trim() ?? '';
      const jsonStr = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

      try {
        data = JSON.parse(jsonStr);
      } catch {
        return NextResponse.json(
          { error: "Couldn't extract a recipe from this page. Try entering it manually." },
          { status: 422 }
        );
      }
    }

    // Append source URL to notes
    const existingNotes = (data.notes as string) || '';
    data.notes = (existingNotes ? existingNotes + '\n\n' : '') + 'Source: ' + url;

    return NextResponse.json({ data, sourceUrl: url });
  } catch (error) {
    console.error('Extract from URL error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract recipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
