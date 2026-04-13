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
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload an image, PDF, or Word document.' }, { status: 400 });
    }

    let extracted: unknown;

    if (file.type === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      extracted = await extractFromText(pdfData.text);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      extracted = await extractFromText(result.value);
    } else {
      // Image file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      extracted = await extractFromImage(base64);
    }

    // Try to upload file to Supabase Storage
    let fileUrl: string | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileUrl = await uploadToStorage(file, buffer);
    } catch (e) {
      console.error('File upload to storage failed:', e);
    }

    const data = extracted as Record<string, unknown>;
    // Append source file URL to notes
    if (fileUrl) {
      data.notes = ((data.notes as string) || '') + '\n\nSource file: ' + fileUrl;
    }

    return NextResponse.json({ data, fileUrl });
  } catch (error) {
    console.error('Extract from file error:', error);
    const message = error instanceof Error ? error.message : 'Failed to extract recipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
