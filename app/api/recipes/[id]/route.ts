import { NextResponse } from 'next/server';

// Mock data for now - in a real app this would come from Supabase
const mockRecipe = {
  id: '1',
  name: "Claire's Coffee Oreo Ice Cream",
  description: "Rich, creamy, coffee-forward ice cream with crushed Oreos folded in. No ice cream maker required (uses Ninja Creami or similar).",
  tags: ['dessert', 'ice cream', 'coffee', 'no-bake'],
  base_servings: 6,
  image_url: null,
};

const mockIngredients = [
  {
    id: '1',
    recipe_id: '1',
    quantity: 2,
    unit: 'cups',
    name: 'heavy cream',
    order_index: 1
  },
  {
    id: '2',
    recipe_id: '1',
    quantity: 0.75,
    unit: 'cup',
    name: 'whole milk',
    order_index: 2
  },
  {
    id: '3',
    recipe_id: '1',
    quantity: 1,
    unit: 'tbsp',
    name: 'dry milk (powdered)',
    order_index: 3
  },
  {
    id: '4',
    recipe_id: '1',
    quantity: 0.75,
    unit: 'cup',
    name: 'granulated sugar',
    note: 'divided',
    order_index: 4
  },
  {
    id: '5',
    recipe_id: '1',
    quantity: 5,
    unit: 'whole',
    name: 'large egg yolks',
    order_index: 5
  },
  {
    id: '6',
    recipe_id: '1',
    quantity: 1,
    unit: 'tsp',
    name: 'vanilla paste',
    order_index: 6
  },
  {
    id: '7',
    recipe_id: '1',
    quantity: 1,
    unit: 'pinch',
    name: 'salt',
    order_index: 7
  },
  {
    id: '8',
    recipe_id: '1',
    quantity: 3,
    unit: 'capsules',
    name: 'Cometeer espresso',
    note: '≈ 5 tbsp liquid; or sub powdered espresso',
    order_index: 8
  },
  {
    id: '9',
    recipe_id: '1',
    quantity: 6,
    unit: 'oz',
    name: 'Oreos',
    note: 'broken into pieces, optional',
    order_index: 9
  }
];

const mockSteps = [
  {
    id: '1',
    recipe_id: '1',
    step_number: 1,
    instruction: "Make the base: In a medium saucepan over medium heat, combine the heavy cream, whole milk, a portion of the sugar (reserve the rest for the yolks), a pinch of salt, powdered milk, and the vanilla paste. Whisk until the sugar is dissolved, then bring to a gentle simmer, whisking occasionally."
  },
  {
    id: '2',
    recipe_id: '1',
    step_number: 2,
    instruction: "Temper the yolks: In a separate bowl, whisk together the egg yolks and the remaining sugar until the mixture turns pale. While constantly whisking, slowly add about half of the hot milk mixture to the yolks to bring them up to temperature without scrambling."
  },
  {
    id: '3',
    recipe_id: '1',
    step_number: 3,
    instruction: "Cook the custard: Return the tempered yolk mixture to the saucepan and whisk constantly over medium heat until the mixture reaches 170°F. Remove from heat immediately."
  },
  {
    id: '4',
    recipe_id: '1',
    step_number: 4,
    instruction: "Add the coffee: Whisk in the Cometeer espresso (or substitute) until fully incorporated."
  },
  {
    id: '5',
    recipe_id: '1',
    step_number: 5,
    instruction: "Strain and chill: Pour the mixture through a fine-mesh strainer into a 1-quart container. Refrigerate overnight to chill completely."
  },
  {
    id: '6',
    recipe_id: '1',
    step_number: 6,
    instruction: "Spin the ice cream: Pour the chilled mixture into an ice cream maker and spin according to manufacturer's instructions. (Using Ninja Creami on 'Ice Cream' setting — it comes out soft; better after 30 min in freezer.)"
  },
  {
    id: '7',
    recipe_id: '1',
    step_number: 7,
    instruction: "Add the Oreos: Fold in the broken Oreos while the ice cream is still soft and loose, then return to the freezer for at least 4–6 hours before serving."
  }
];

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // In a real app, we would fetch from Supabase:
    // const { data: recipeData, error: recipeError } = await supabase
    //   .from('recipes')
    //   .select('*')
    //   .eq('id', params.id)
    //   .single();
    
    // const { data: ingredientsData, error: ingredientsError } = await supabase
    //   .from('ingredients')
    //   .select('*')
    //   .eq('recipe_id', params.id)
    //   .order('order_index');
    
    // const { data: stepsData, error: stepsError } = await supabase
    //   .from('steps')
    //   .select('*')
    //   .eq('recipe_id', params.id)
    //   .order('step_number');
    
    return NextResponse.json({
      ...mockRecipe,
      ingredients: mockIngredients.sort((a, b) => a.order_index - b.order_index),
      steps: mockSteps.sort((a, b) => a.step_number - b.step_number)
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}