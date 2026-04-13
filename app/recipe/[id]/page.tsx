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
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingUpdating, setRatingUpdating] = useState(false);

  const fetchRecipe = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data: Recipe = await res.json();
      setRecipe(data);
      setCurrentServings(data.servings);
      setUserRating(data.rating ?? null);
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

  // Build scaled ingredient display using current servings
  const printIngredients = recipe.ingredients?.map((ing) => {
    const num = parseFloat(ing.amount);
    const scaled = isNaN(num) ? ing.amount : num * scaleRatio;
    const scaledAmount = Number.isInteger(scaled) ? String(scaled) : Number(scaled).toFixed(2).replace(/\.?0+$/, '');
    return { ...ing, scaledAmount };
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="print-recipe bg-espresso text-cream py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="no-print text-cream/60 hover:text-cream text-sm mb-4 inline-flex items-center gap-1">
            ← Back to recipes
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
              {/* Category badge */}
              {recipe.category && (
                <span className="inline-block px-2.5 py-0.5 bg-sage/30 text-cream/90 rounded-full text-xs font-medium mb-2">
                  {recipe.category}
                </span>
              )}
              <div className="print-meta flex flex-wrap gap-3 text-sm text-cream/70">
                {recipe.prep_time && <span>Prep: {recipe.prep_time}</span>}
                {recipe.cook_time && <span>Cook: {recipe.cook_time}</span>}
                <span>Serves {currentServings}</span>
              </div>
              {/* Interactive star rating */}
              <div className="flex items-center gap-1 mt-3 no-print" aria-label="Rate this recipe">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={async () => {
                      if (ratingUpdating) return;
                      setRatingUpdating(true);
                      const newRating = star === userRating ? null : star;
                      setUserRating(newRating);
                      await fetch(`/api/recipes/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating: newRating }),
                      });
                      setRatingUpdating(false);
                    }}
                    className={`text-2xl transition-colors ${
                      star <= (userRating ?? 0)
                        ? 'text-caramel'
                        : 'text-cream/30 hover:text-cream/60'
                    }`}
                    title={star === userRating ? 'Remove rating' : `Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    {star <= (userRating ?? 0) ? '★' : '☆'}
                  </button>
                ))}
                {userRating && (
                  <span className="text-cream/50 text-sm ml-1">{userRating}/5</span>
                )}
                {!userRating && (
                  <span className="text-cream/40 text-sm ml-1">Rate this recipe</span>
                )}
              </div>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="no-print px-2 py-0.5 bg-cream/10 text-cream/80 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="no-print flex gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-caramel hover:bg-caramel/80 text-espresso rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
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
            <p className="print-notes mt-4 text-cream/60 italic text-sm">{recipe.notes}</p>
          )}
        </div>
      </header>

      <main className="print-recipe max-w-5xl mx-auto px-6 py-8">
        {/* Serving Scaler */}
        <div className="no-print bg-white rounded-xl p-5 mb-8 border border-espresso/10 flex flex-col sm:flex-row sm:items-center gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 print-body">
          {/* Ingredients */}
          <div className="lg:col-span-2 print-section">
            <h2 className="text-xl font-bold text-espresso mb-4 border-b border-espresso/10 pb-2">
              Ingredients
              {scaleRatio !== 1 && (
                <span className="text-caramel text-base font-normal ml-2">(×{scaleRatio.toFixed(2)})</span>
              )}
            </h2>
            <ul className="space-y-3">
              {recipe.ingredients?.map((ing, i) => {
                const num = parseFloat(ing.amount);
                const scaled = isNaN(num) ? ing.amount : num * scaleRatio;
                const scaledAmount = Number.isInteger(scaled) ? String(scaled) : Number(scaled).toFixed(2).replace(/\.?0+$/, '');
                return (
                  <li key={i} className="print-ingredient-item flex items-start gap-3 p-3 rounded-lg bg-white border border-espresso/10">
                    <div className="print-ingredient-dot flex-shrink-0 w-2 h-2 rounded-full bg-caramel mt-2" />
                    <div>
                      <span className="print-ingredient-amount font-semibold text-espresso mr-2">{scaledAmount}</span>
                      <span className="print-ingredient-unit text-espresso/80 mr-2">{ing.unit}</span>
                      <span className="print-ingredient-item-name text-espresso">{ing.item}</span>
                      {ing.notes && (
                        <span className="print-ingredient-notes block text-sm text-espresso/50 italic mt-0.5">{ing.notes}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Instructions */}
          <div className="lg:col-span-3 print-section">
            <h2 className="text-xl font-bold text-espresso mb-4 border-b border-espresso/10 pb-2">Instructions</h2>
            {(!recipe.instructions || recipe.instructions.length === 0) ? (
              <p className="text-espresso/60 italic">No instructions yet.</p>
            ) : (
              <ol className="space-y-5">
                {recipe.instructions.map((ins, i) => (
                  <li key={i} className="print-instruction-item flex gap-4">
                    <span className="print-instruction-number flex-shrink-0 w-8 h-8 rounded-full bg-caramel text-espresso flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </span>
                    <p className="print-instruction-step text-espresso/90 pt-1 leading-relaxed">{ins.step}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Source URL */}
        {(recipe as any).source_url && (
          <p className="print-source mt-8 pt-4 border-t border-espresso/10 text-xs text-espresso/40">
            Source: {(recipe as any).source_url}
          </p>
        )}
      </main>
    </div>
  );
}
