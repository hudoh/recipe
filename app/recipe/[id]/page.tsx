'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ServingScaler from '@/components/ServingScaler';
import IngredientList from '@/components/IngredientList';

// Define types
type Tag = string;

export type Recipe = {
  id: string;
  name: string;
  description: string;
  tags: Tag[];
  base_servings: number;
  image_url?: string;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  quantity: number;
  unit: string;
  name: string;
  note?: string;
  order_index: number;
};

export type Step = {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
};

interface RecipeDetailPageProps {
  params: {
    id: string;
  };
}

const RecipeDetailPage: React.FC<RecipeDetailPageProps> = ({ params }) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentServings, setCurrentServings] = useState<number>(0);
  
  // Fetch recipe data
  useEffect(() => {
    const fetchRecipeData = async () => {
      try {
        // In a real app, this would call your API
        // For now we'll use mock data to demonstrate the UI
        
        const mockRecipe: Recipe = {
          id: params.id,
          name: "Claire's Coffee Oreo Ice Cream",
          description: "Rich, creamy, coffee-forward ice cream with crushed Oreos folded in. No ice cream maker required (uses Ninja Creami or similar).",
          tags: ['dessert', 'ice cream', 'coffee', 'no-bake'],
          base_servings: 6,
        };
        
        const mockIngredients: Ingredient[] = [
          {
            id: '1',
            recipe_id: params.id,
            quantity: 2,
            unit: 'cups',
            name: 'heavy cream',
            order_index: 1
          },
          {
            id: '2',
            recipe_id: params.id,
            quantity: 0.75,
            unit: 'cup',
            name: 'whole milk',
            order_index: 2
          },
          {
            id: '3',
            recipe_id: params.id,
            quantity: 1,
            unit: 'tbsp',
            name: 'dry milk (powdered)',
            order_index: 3
          },
          {
            id: '4',
            recipe_id: params.id,
            quantity: 0.75,
            unit: 'cup',
            name: 'granulated sugar',
            note: 'divided',
            order_index: 4
          },
          {
            id: '5',
            recipe_id: params.id,
            quantity: 5,
            unit: 'whole',
            name: 'large egg yolks',
            order_index: 5
          },
          {
            id: '6',
            recipe_id: params.id,
            quantity: 1,
            unit: 'tsp',
            name: 'vanilla paste',
            order_index: 6
          },
          {
            id: '7',
            recipe_id: params.id,
            quantity: 1,
            unit: 'pinch',
            name: 'salt',
            order_index: 7
          },
          {
            id: '8',
            recipe_id: params.id,
            quantity: 3,
            unit: 'capsules',
            name: 'Cometeer espresso',
            note: '≈ 5 tbsp liquid; or sub powdered espresso',
            order_index: 8
          },
          {
            id: '9',
            recipe_id: params.id,
            quantity: 6,
            unit: 'oz',
            name: 'Oreos',
            note: 'broken into pieces, optional',
            order_index: 9
          }
        ];
        
        const mockSteps: Step[] = [
          {
            id: '1',
            recipe_id: params.id,
            step_number: 1,
            instruction: "Make the base: In a medium saucepan over medium heat, combine the heavy cream, whole milk, a portion of the sugar (reserve the rest for the yolks), a pinch of salt, powdered milk, and the vanilla paste. Whisk until the sugar is dissolved, then bring to a gentle simmer, whisking occasionally."
          },
          {
            id: '2',
            recipe_id: params.id,
            step_number: 2,
            instruction: "Temper the yolks: In a separate bowl, whisk together the egg yolks and the remaining sugar until the mixture turns pale. While constantly whisking, slowly add about half of the hot milk mixture to the yolks to bring them up to temperature without scrambling."
          },
          {
            id: '3',
            recipe_id: params.id,
            step_number: 3,
            instruction: "Cook the custard: Return the tempered yolk mixture to the saucepan and whisk constantly over medium heat until the mixture reaches 170°F. Remove from heat immediately."
          },
          {
            id: '4',
            recipe_id: params.id,
            step_number: 4,
            instruction: "Add the coffee: Whisk in the Cometeer espresso (or substitute) until fully incorporated."
          },
          {
            id: '5',
            recipe_id: params.id,
            step_number: 5,
            instruction: "Strain and chill: Pour the mixture through a fine-mesh strainer into a 1-quart container. Refrigerate overnight to chill completely."
          },
          {
            id: '6',
            recipe_id: params.id,
            step_number: 6,
            instruction: "Spin the ice cream: Pour the chilled mixture into an ice cream maker and spin according to manufacturer's instructions. (Using Ninja Creami on 'Ice Cream' setting — it comes out soft; better after 30 min in freezer.)"
          },
          {
            id: '7',
            recipe_id: params.id,
            step_number: 7,
            instruction: "Add the Oreos: Fold in the broken Oreos while the ice cream is still soft and loose, then return to the freezer for at least 4–6 hours before serving."
          }
        ];
        
        setRecipe(mockRecipe);
        setIngredients(mockIngredients.sort((a, b) => a.order_index - b.order_index));
        setSteps(mockSteps.sort((a, b) => a.step_number - b.step_number));
        setCurrentServings(mockRecipe.base_servings);
      } catch (error) {
        console.error('Error fetching recipe data:', error);
      }
    };

    fetchRecipeData();
  }, [params.id]);

  if (!recipe) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center text-caramel hover:text-sage mb-6 transition-colors"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Recipes
        </Link>

        {/* Recipe Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-espresso mb-4">{recipe.name}</h1>
          <p className="text-lg text-espresso/80 mb-6">{recipe.description}</p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tags.map(tag => (
              <span 
                key={tag} 
                className="px-3 py-1 bg-caramel text-espresso rounded-full text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Serving Scaler */}
        <div className="bg-cream rounded-xl p-6 mb-8 border border-espresso/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-espresso mb-2">Servings</h2>
              <p className="text-espresso/70">
                Adjust the serving size to scale ingredients automatically
              </p>
            </div>
            <ServingScaler 
              baseServings={recipe.base_servings}
              currentServings={currentServings}
              onServingsChange={setCurrentServings}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-espresso mb-4">Ingredients</h2>
            <IngredientList 
              baseServings={recipe.base_servings}
              currentServings={currentServings}
              ingredients={ingredients}
            />
          </div>

          {/* Instructions */}
          <div>
            <h2 className="text-2xl font-bold text-espresso mb-4">Instructions</h2>
            <ol className="space-y-6">
              {steps.map(step => (
                <li key={step.id} className="flex">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-caramel text-espresso flex items-center justify-center font-bold mr-4">
                    {step.step_number}
                  </span>
                  <p className="text-espresso/90 pt-1">{step.instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;