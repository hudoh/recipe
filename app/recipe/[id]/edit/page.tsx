'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';
import type { Recipe } from '@/types/recipe';

export default function EditRecipePage() {
  const params = useParams();
  const id = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setRecipe(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-espresso/50">Loading...</div>;
  }

  if (!recipe) {
    return <div className="min-h-screen flex items-center justify-center text-espresso/60">Recipe not found</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-espresso text-cream py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Edit Recipe</h1>
          <p className="text-cream/60 mt-1">Update the details for {recipe.name}</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <RecipeForm initialData={recipe} isEdit />
      </main>
    </div>
  );
}
