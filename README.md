# Recipe Manager

A warm, cookbook-aesthetic recipe web app with dynamic serving scaling, built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Dynamic Serving Scaler** — Pick a recipe, adjust servings, all ingredient quantities update instantly
- **Smart Fraction Display** — Decimals convert to cooking-friendly fractions (0.75 → ¾, 0.333 → ⅓)
- **Recipe Browsing** — Grid view of all your recipes
- **Search & Tag Filtering** — Find recipes quickly
- **Add / Edit / Delete** — Full CRUD for your recipe collection
- **Warm Cookbook Aesthetic** — Cream (#FDF6EC), espresso (#2C1810), caramel (#D4956A), sage (#7D8C6B)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Row Level Security)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/hudoh/recipe.git
cd recipe
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the following SQL in the **Supabase SQL Editor**:

```sql
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  servings INTEGER DEFAULT 1,
  prep_time TEXT,
  cook_time TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON recipes FOR SELECT USING (true);
CREATE POLICY "Public insert" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON recipes FOR DELETE USING (true);
```

**Seed the database with a sample recipe:**

```sql
INSERT INTO recipes (name, servings, prep_time, cook_time, ingredients, instructions, tags, notes)
VALUES (
  'Coffee Oreo Ice Cream',
  6,
  '15 min',
  '0 min (no cook)',
  '[{"item":"whole milk","amount":"1.25","unit":"cups","notes":""},{"item":"heavy cream","amount":"2.5","unit":"cups","notes":""},{"item":"espresso or very strong coffee","amount":"2","unit":"shots","notes":"cooled"},{"item":"egg yolks","amount":"6","unit":"large","notes":""},{"item":"sugar","amount":"0.75","unit":"cup","notes":""},{"item":"salt","amount":"0.125","unit":"tsp","notes":"pinch"},{"item":"Oreo cookies","amount":"15-20","unit":"cookies","notes":"roughly crushed, plus more for topping"},{"item":"vanilla extract","amount":"1","unit":"tsp","notes":""}]',
  '[{"step":"Heat milk, cream, and espresso in saucepan until simmering"},{"step":"Whisk yolks and sugar, temper with hot milk mixture"},{"step":"Return to pan, stir until coating back of spoon (185°F)"},{"step":"Strain, chill completely (overnight preferred)"},{"step":"Churn in ice cream maker per manufacturer instructions"},{"step":"Fold in crushed Oreos, freeze until firm"}]',
  ARRAY['dessert','ice cream','no-cook','vegetarian'],
  'Based on Claire''s Coffee Oreo Ice Cream from Reddit. Chill custard overnight for best results.'
);
```

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project URL and anon key (found in Supabase Dashboard → Project Settings → API).

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this code to a GitHub repo
2. Go to [vercel.com](https://vercel.com), click **Add New Project**
3. Import your repo
4. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables in Vercel project settings
5. Deploy — Vercel auto-deploys on every push to `main`

## Supabase Schema

The `recipes` table uses the following JSONB structure:

**ingredients:**
```json
[{"item":"flour","amount":"2","unit":"cups","notes":"sifted"}]
```

**instructions:**
```json
[{"step":"Preheat oven to 350°F"}]
```
