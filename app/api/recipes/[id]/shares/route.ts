import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only recipe owner can view shares
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!recipe || recipe.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: shares } = await supabase
    .from('recipe_shares')
    .select('shared_with_user_id, profiles(id, username, display_name, avatar_url)')
    .eq('recipe_id', id);

  const users = (shares ?? [])
    .map(s => s.profiles)
    .filter(Boolean);

  return NextResponse.json({ users });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only recipe owner can share
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!recipe || recipe.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const { error } = await supabase
    .from('recipe_shares')
    .insert({ recipe_id: id, shared_with_user_id: userId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
