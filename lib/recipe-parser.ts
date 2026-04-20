/**
 * Structured recipe extraction from HTML using cheerio.
 * Prioritizes JSON-LD schema.org/Recipe data, falls back to DOM parsing.
 */

import { load } from 'cheerio';

export interface ParsedRecipe {
  name: string | null;
  servings: number | null;
  prep_time: string | null;
  cook_time: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  notes: string | null;
}

function parseISODuration(iso: string): string | null {
  if (!iso) return null;
  // PT15M → 15 min, PT1H30M → 1 hr 30 min
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  const hours = match[1] ? `${match[1]} hr` : '';
  const mins = match[2] ? `${match[2]} min` : '';
  return [hours, mins].filter(Boolean).join(' ');
}

function extractJsonLd(html: string): Partial<ParsedRecipe> | null {
  const $ = load(html);
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const tag = scripts[i];
    const content = $(tag).html();
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      // Handle @graph arrays
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe')) {
          const recipe = item;
          // Parse ingredients
          const ingredients: string[] = [];
          if (recipe.recipeIngredient) {
            for (const ing of recipe.recipeIngredient) {
              const s = String(ing).trim();
              if (s) ingredients.push(s);
            }
          }
          // Parse instructions
          const instructions: string[] = [];
          if (recipe.recipeInstructions) {
            const steps = Array.isArray(recipe.recipeInstructions)
              ? recipe.recipeInstructions.map((s: unknown) => {
                  if (typeof s === 'string') return s.trim();
                  if (typeof s === 'object' && s !== null) {
                    return (s as { text?: string }).text?.trim() ?? '';
                  }
                  return '';
                }).filter(Boolean)
              : [String(recipe.recipeInstructions).trim()];
            instructions.push(...steps);
          }
          // Parse times
          const prep_time = parseISODuration(recipe.prepTime ?? '') ||
            parseISODuration(recipe.totalTime ?? '');
          const cook_time = parseISODuration(recipe.cookTime ?? '');
          // Parse servings
          let servings: number | null = null;
          const yield_ = recipe.recipeYield ?? recipe.yield;
          if (yield_) {
            const m = String(yield_).match(/\d+/);
            if (m) servings = parseInt(m[0]);
          }
          return {
            name: recipe.name ?? null,
            servings,
            prep_time: prep_time ?? null,
            cook_time: cook_time ?? null,
            ingredients,
            instructions,
            tags: Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory
              : recipe.recipeCategory ? [String(recipe.recipeCategory)]
              : [],
            notes: null,
          };
        }
      }
    } catch {
      // Not valid JSON, skip
    }
  }
  return null;
}

function extractFromDom(html: string): Partial<ParsedRecipe> {
  const $ = load(html);
  const name = $('h1').first().text().trim() || null;

  // Try to find ingredients section
  const ingredients: string[] = [];
  // AllRecipes-style: elements with ingredient-related classes or in ingredient sections
  $('[class*="ingredient"], .recipe-ingredients li, [data-ingredient], .ingredient-list li')
    .each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2 && text.length < 300) {
        ingredients.push(text);
      }
    });

  // Fallback: look for "Ingredients" heading and grab following list/paragraphs
  if (ingredients.length === 0) {
    $('h2, h3, h4').each((_, el) => {
      const heading = $(el).text().toLowerCase();
      if (heading.includes('ingredient')) {
        let sibling = $(el).next();
        let collected = 0;
        while (sibling.length && collected < 30) {
          const tag = (sibling[0] as { tagName?: string }).tagName?.toLowerCase();
          if (tag === 'ul' || tag === 'ol') {
            sibling.find('li').each((__, li) => {
              const t = $(li).text().trim();
              if (t) ingredients.push(t);
            });
            break;
          }
          if (tag && ['h2', 'h3', 'h4'].includes(tag)) break;
          const txt = sibling.text().trim();
          if (txt) ingredients.push(txt);
          sibling = sibling.next();
          collected++;
        }
      }
    });
  }

  // Try to find instructions/directions section
  const instructions: string[] = [];
  $('[class*="instruction"], .recipe-directions li, [data-direction], .direction-list li, .instructions li, .recipe-steps li')
    .each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5 && text.length < 1000) {
        instructions.push(text);
      }
    });

  // Fallback: look for "Directions" / "Instructions" heading
  if (instructions.length === 0) {
    $('h2, h3, h4').each((_, el) => {
      const heading = $(el).text().toLowerCase();
      if (heading.includes('direction') || heading.includes('instruction') || heading.includes('method')) {
        let sibling = $(el).next();
        let collected = 0;
        while (sibling.length && collected < 30) {
          const tag = (sibling[0] as { tagName?: string }).tagName?.toLowerCase();
          if (tag === 'ol') {
            sibling.find('li').each((__, li) => {
              const t = $(li).text().trim();
              if (t) instructions.push(t);
            });
            break;
          }
          if (tag && ['h2', 'h3', 'h4'].includes(tag)) break;
          const txt = sibling.text().trim();
          if (txt && txt.length > 5) instructions.push(txt);
          sibling = sibling.next();
          collected++;
        }
      }
    });
  }

  return { name, ingredients, instructions, servings: null, prep_time: null, cook_time: null, tags: [], notes: null };
}

export function parseRecipeHtml(html: string): ParsedRecipe {
  // Try JSON-LD first (most reliable for structured recipe sites)
  const jsonLd = extractJsonLd(html);
  if (jsonLd && (jsonLd.ingredients?.length ?? 0) > 0) {
    return {
      name: jsonLd.name ?? null,
      servings: jsonLd.servings ?? null,
      prep_time: jsonLd.prep_time ?? null,
      cook_time: jsonLd.cook_time ?? null,
      ingredients: jsonLd.ingredients ?? [],
      instructions: jsonLd.instructions ?? [],
      tags: jsonLd.tags ?? [],
      notes: jsonLd.notes ?? null,
    };
  }

  // Fall back to DOM parsing
  const dom = extractFromDom(html);
  return {
    name: dom.name ?? null,
    servings: null,
    prep_time: null,
    cook_time: null,
    ingredients: dom.ingredients ?? [],
    instructions: dom.instructions ?? [],
    tags: [],
    notes: null,
  };
}
