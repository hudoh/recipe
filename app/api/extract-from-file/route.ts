import { NextResponse } from 'next/server';
import OpenAI from 'openai';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return { url, key };
}

async function uploadToStorage(file: File, buffer: Buffer): Promise<string | null> {
  const { url: supabaseUrl, key } = getSupabaseAdmin();
  const fileName = `${Date.now()}-${file.name}`;
  // Use service role key if available, otherwise anon key
  const res = await fetch(`${supabaseUrl}/storage/v1/object/recipe-files/${fileName}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    console.error('Storage upload failed:', await res.text());
    return null;
  }
  return `${supabaseUrl}/storage/v1/object/public/recipe-files/${fileName}`;
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Given recipe content from an image, PDF, or document, extract the recipe data and return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just the JSON):

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
- ingredient amounts MUST be decimal numbers (e.g. 0.5 not 1/2, 0.25 not 1/4, 1.5 not 1 1/2). Convert all fractions to decimals.
- ingredients should have item, amount, unit, notes fields
- instructions should be an array of {step} objects
- tags should be an array of strings`;

const VISION_PROMPT = `${EXTRACTION_PROMPT}

The user is uploading an image of a recipe. Analyze the image carefully and extract all recipe information.`;

const TEXT_PROMPT = `${EXTRACTION_PROMPT}

Extract the recipe from the following text content:`;

async function extractFromImage(base64Data: string): Promise<unknown> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: 'high' },
          },
          { type: 'text', text: VISION_PROMPT },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';
  // Strip markdown code blocks if present
  const jsonStr = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(jsonStr);
}

async function extractFromText(text: string): Promise<unknown> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: `${TEXT_PROMPT}\n\n${text.slice(0, 8000)}` },
    ],
    max_tokens: 2048,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';
  const jsonStr = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(jsonStr);
}

export async function POST(request: Request) {
  console.log('extract-from-file called, content-length:', request.headers.get('content-length'));
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" is too large. Maximum size is 10MB.` }, { status: 400 });
      }
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Unsupported file type for "${file.name}". Please upload an image, PDF, or Word document.` }, { status: 400 });
      }
    }

    // Separate images from docs
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const docFiles = files.filter(f => !f.type.startsWith('image/'));

    // Extract from text-based docs first (PDF, Word) — single source of truth
    let docExtracted: Record<string, unknown> | null = null;
    for (const file of docFiles) {
      let text = '';
      if (file.type === 'application/pdf') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      }
      if (text) {
        docExtracted = await extractFromText(text) as Record<string, unknown>;
        break; // only process first doc
      }
    }

    // Extract from images and merge results
    let mergedExtracted: Record<string, unknown> = docExtracted ? { ...docExtracted } : {};
    for (const file of imageFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const imgExtracted = await extractFromImage(base64) as Record<string, unknown>;

      // Merge ingredients
      const existingIngredients = (mergedExtracted.ingredients as Array<Record<string, unknown>> | undefined) || [];
      const newIngredients = (imgExtracted.ingredients as Array<Record<string, unknown>> | undefined) || [];
      // Avoid duplicates: skip ingredients already in the list (by item name)
      const existingNames = new Set(existingIngredients.map((i: Record<string, unknown>) => String(i.item).toLowerCase()));
      const uniqueNew = newIngredients.filter((i: Record<string, unknown>) => !existingNames.has(String(i.item).toLowerCase()));
      if (uniqueNew.length > 0) {
        mergedExtracted.ingredients = [...existingIngredients, ...uniqueNew];
      }

      // Merge instructions
      const existingInstructions = (mergedExtracted.instructions as Array<Record<string, unknown>> | undefined) || [];
      const newInstructions = (imgExtracted.instructions as Array<Record<string, unknown>> | undefined) || [];
      if (newInstructions.length > 0) {
        mergedExtracted.instructions = [...existingInstructions, ...newInstructions.map((s: Record<string, unknown>, idx: number) => ({
          step: s.step ? `Photo ${imageFiles.indexOf(file) + 1}: ${s.step}` : `Photo ${imageFiles.indexOf(file) + 1} instruction ${idx + 1}`
        }))];
      }

      // Merge notes
      if (imgExtracted.notes) {
        mergedExtracted.notes = ((mergedExtracted.notes as string) || '') + (mergedExtracted.notes ? '; ' : '') + imgExtracted.notes;
      }
    }

    // Upload all files to Supabase Storage
    let fileUrls: string[] = [];
    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadToStorage(file, buffer);
        if (url) fileUrls.push(url);
      }
    } catch (e) {
      console.error('File upload to storage failed:', e);
    }

    const data = mergedExtracted;
    // Append source file URLs to notes
    if (fileUrls.length > 0) {
      data.notes = ((data.notes as string) || '') + '\n\nSource files: ' + fileUrls.join(', ');
    }

    return NextResponse.json({ data, fileUrls });
  } catch (error) {
    console.error('Extract from file error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract recipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
