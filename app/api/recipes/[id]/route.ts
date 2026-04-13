import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { calculateNutrition } from '@/lib/openai';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createClient();

    // Handle make_again_count increment specially
    if (body.increment_make_again) {
      const { data: current, error: fetchError } = await supabase
        .from('recipes')
        .select('make_again_count')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('recipes')
        .update({
          make_again_count: (current.make_again_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Strip server-managed fields that shouldn't be overwritten
    const {
      increment_make_again,
      // Allow client to pass is_favorite and make_again_count
      is_favorite,
      make_again_count,
      nutrition,
      // These are computed server-side, not directly settable
      ingredients,
      name,
      servings,
      ...rest
    } = body;

    const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };

    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    if (make_again_count !== undefined) updateData.make_again_count = make_again_count;
    if (nutrition !== undefined) updateData.nutrition = nutrition;

    // Recalculate nutrition if ingredients/name/servings changed
    if ((ingredients || name || servings) && (ingredients?.length > 0)) {
      const calcNutrition = await calculateNutrition(
        ingredients,
        name,
        servings
      );
      if (calcNutrition) updateData.nutrition = calcNutrition;
    }

    const { data, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
