import OpenAI from 'openai';

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function calculateNutrition(
  ingredients: Array<{ item: string; amount: string; unit: string; notes: string }>,
  name: string,
  servings: number
): Promise<{
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  sugar_g?: number;
} | null> {
  const nutritionPrompt = `Given these recipe ingredients (per serving), estimate the nutritional content. Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number (optional),
  "sodium_mg": number (optional),
  "sugar_g": number (optional)
}

Ingredients: ${JSON.stringify(ingredients)}
Recipe name: ${name}
Servings: ${servings}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: nutritionPrompt }],
      max_tokens: 256,
      temperature: 0.3,
    });

    const jsonStr =
      response.choices[0]?.message?.content
        ?.trim()
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '') ?? '';

    return JSON.parse(jsonStr) as ReturnType<typeof calculateNutrition> extends Promise<infer T> ? T : never;
  } catch (err) {
    console.error('Nutrition calculation failed:', err);
    return null;
  }
}
