import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { calculateNutrition } from '@/lib/openai';

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createClient();

    // Strip any server-managed fields from body
    const { is_favorite, make_again_count, nutrition, ...rest } = body;

    const { data, error } = await supabase
      .from('recipes')
      .insert([{
        ...rest,
        is_favorite: false,
        make_again_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;

    // Calculate nutrition server-side
    if (data.ingredients && data.ingredients.length > 0) {
      const calculated = await calculateNutrition(
        data.ingredients,
        data.name,
        data.servings
      );
      if (calculated) {
        const { error: updateError } = await supabase
          .from('recipes')
          .update({ nutrition: calculated })
          .eq('id', data.id);
        if (!updateError) {
          data.nutrition = calculated;
        }
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
