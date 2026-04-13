import { NextResponse } from 'next/server';

// Mock data for now - in a real app this would come from Supabase
const mockRecipes = [
  {
    id: '1',
    name: "Claire's Coffee Oreo Ice Cream",
    description: "Rich, creamy, coffee-forward ice cream with crushed Oreos folded in.",
    tags: ['dessert', 'ice cream', 'coffee'],
    base_servings: 6,
    image_url: null,
  },
  {
    id: '2',
    name: "Classic Beef Lasagna",
    description: "Layered pasta with rich meat sauce and melted cheese.",
    tags: ['dinner', 'comfort food'],
    base_servings: 8,
    image_url: null,
  },
  {
    id: '3',
    name: "Fresh Berry Smoothie",
    description: "Refreshing blend of seasonal berries and yogurt.",
    tags: ['drink', 'breakfast'],
    base_servings: 4,
    image_url: null,
  }
];

export async function GET() {
  try {
    // In a real app, we would fetch from Supabase:
    // const { data, error } = await supabase.from('recipes').select('*');
    
    return NextResponse.json(mockRecipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}