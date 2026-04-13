'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ServingScaler from '@/components/ServingScaler';
import IngredientList from '@/components/IngredientList';
import type { Recipe } from '@/types/recipe';

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentServings, setCurrentServings] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchRecipe = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data: Recipe = await res.json();
      setRecipe(data);
      setCurrentServings(data.servings);
    } catch {
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRecipe(); }, [fetchRecipe]);

  const handleDelete = async () => {
    if (!confirm(`Delete "${recipe?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-espresso/50">
        Loading...
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-espresso/60">Recipe not found</p>
        <Link href="/" className="btn-caramel">← Back to recipes</Link>
      </div>
    );
  }

  const scaleRatio = currentServings / recipe.servings;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-espresso text-cream py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-cream/60 hover:text-cream text-sm mb-4 inline-flex items-center gap-1">
            ← Back to recipes
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-cream/70">
                {recipe.prep_time && <span>Prep: {recipe.prep_time}</span>}
                {recipe.cook_time && <span>Cook: {recipe.cook_time}</span>}
                <span>Serves {recipe.servings}</span>
              </div>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-cream/10 text-cream/80 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/recipe/${id}/edit`} className="px-4 py-2 bg-cream/10 hover:bg-cream/20 text-cream rounded-lg text-sm transition-colors">
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          {recipe.notes && (
            <p className="mt-4 text-cream/60 italic text-sm">{recipe.notes}</p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Serving Scaler */}
        <div className="bg-white rounded-xl p-5 mb-8 border border-espresso/10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-grow">
            <h2 className="font-bold text-espresso">Adjust Servings</h2>
            <p className="text-sm text-espresso/60">Ingredient amounts update instantly</p>
          </div>
          <ServingScaler
            baseServings={recipe.servings}
            currentServings={currentServings}
            onServingsChange={setCurrentServings}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Ingredients */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-espresso mb-4 border-b border-espresso/10 pb-2">
              Ingredients {scaleRatio !== 1 && <span className="text-caramel text-base font-normal">(×{scaleRatio.toFixed(2)})</span>}
            </h2>
            <IngredientList ingredients={recipe.ingredients ?? []} scaleRatio={scaleRatio} />
          </div>

          {/* Instructions */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-espresso mb-4 border-b border-espresso/10 pb-2">Instructions</h2>
            {(!recipe.instructions || recipe.instructions.length === 0) ? (
              <p className="text-espresso/60 italic">No instructions yet.</p>
            ) : (
              <ol className="space-y-5">
                {recipe.instructions.map((ins, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-caramel text-espresso flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </span>
                    <p className="text-espresso/90 pt-1 leading-relaxed">{ins.step}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
