'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ServingScaler from '@/components/ServingScaler';
import type { Recipe, Nutrition } from '@/types/recipe';

/** Parse a fraction or mixed number string like "1/2", "1 1/2", "3/4" into a numeric value */
function parseFraction(str: string): number {
  const s = str.trim();
  if (!s) return NaN;
  // Mixed fraction: "1 1/2" → whole + fraction
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return whole + num / den;
  }
  // Simple fraction: "1/2"
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }
  // Plain number
  return parseFloat(s);
}

function NutritionFactsBox({ nutrition, servings }: { nutrition: Nutrition; servings: number }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-espresso/10 print-section">
      <div className="border border-espresso p-4 max-w-xs">
        {/* Header */}
        <div className="border-b border-espresso pb-2 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-espresso">Nutrition Facts</h3>
          <p className="text-xs text-espresso/60">Per serving (recipe makes {servings} serving{servings !== 1 ? 's' : ''})</p>
        </div>

        {/* Calories */}
        <div className="border-b border-espresso pb-2 mb-2">
          <div className="flex justify-content-between items-baseline">
            <span className="font-bold text-espresso text-sm">Calories</span>
            <span className="font-bold text-espresso text-lg ml-auto">{nutrition.calories}</span>
          </div>
        </div>

        {/* Macros */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-espresso">
              <span className="font-bold">Total Fat</span>
              <span className="text-espresso/60 ml-1">{nutrition.fat_g}g</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-espresso">
              <span className="font-bold">Total Carbohydrate</span>
              <span className="text-espresso/60 ml-1">{nutrition.carbs_g}g</span>
            </span>
          </div>
          {nutrition.fiber_g != null && (
            <div className="flex justify-between text-sm pl-4 text-espresso/70">
              <span>Dietary Fiber {nutrition.fiber_g}g</span>
            </div>
          )}
          {nutrition.sugar_g != null && (
            <div className="flex justify-between text-sm pl-4 text-espresso/70">
              <span>Total Sugars {nutrition.sugar_g}g</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-espresso">
              <span className="font-bold">Protein</span>
              <span className="text-espresso/60 ml-1">{nutrition.protein_g}g</span>
            </span>
          </div>
        </div>

        {/* Optionals */}
        {(nutrition.sodium_mg != null || nutrition.fiber_g != null || nutrition.sugar_g != null) && (
          <div className="border-t border-espresso mt-2 pt-2 space-y-1">
            {nutrition.sodium_mg != null && (
              <div className="flex justify-between text-xs text-espresso">
                <span className="font-bold">Sodium</span>
                <span>{nutrition.sodium_mg}mg</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentServings, setCurrentServings] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingUpdating, setRatingUpdating] = useState(false);
  const [favoriteUpdating, setFavoriteUpdating] = useState(false);
  const [makeAgainUpdating, setMakeAgainUpdating] = useState(false);

  const fetchRecipe = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data: Recipe = await res.json();
      setRecipe(data);
      setCurrentServings(data.servings ?? 1);
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

  const scaleRatio = recipe.servings ? currentServings / recipe.servings : 1;

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
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{recipe.name}</h1>
                {/* Favorite heart button */}
                <button
                  onClick={async () => {
                    if (favoriteUpdating) return;
                    setFavoriteUpdating(true);
                    const newFavorite = !recipe.is_favorite;
                    setRecipe(prev => prev ? { ...prev, is_favorite: newFavorite } : prev);
                    await fetch(`/api/recipes/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_favorite: newFavorite }),
                    });
                    setFavoriteUpdating(false);
                  }}
                  className="text-2xl transition-transform hover:scale-110 no-print"
                  title={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {recipe.is_favorite ? '❤️' : '♡'}
                </button>
              </div>
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
            baseServings={recipe.servings ?? 1}
            currentServings={currentServings}
            onServingsChange={setCurrentServings}
          />
        </div>

        {/* Make Again Button */}
        <div className="bg-white rounded-xl p-5 mb-8 border border-espresso/10 flex flex-col sm:flex-row sm:items-center gap-4 no-print">
          <div className="flex-grow">
            <h2 className="font-bold text-espresso">Made this recipe?</h2>
            <p className="text-sm text-espresso/60">
              Track how many times you've cooked this{recipe.make_again_count != null && recipe.make_again_count > 0 ? ` — ${recipe.make_again_count} time${recipe.make_again_count !== 1 ? 's' : ''} so far` : ''}
            </p>
          </div>
          <button
            onClick={async () => {
              if (makeAgainUpdating) return;
              setMakeAgainUpdating(true);
              await fetch(`/api/recipes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ increment_make_again: true }),
              });
              await fetchRecipe();
              setMakeAgainUpdating(false);
            }}
            disabled={makeAgainUpdating}
            className="px-5 py-2.5 bg-sage hover:bg-sage/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="text-base">🍽️</span>
            {makeAgainUpdating ? 'Saving…' : `I've Made This${recipe.make_again_count != null && recipe.make_again_count > 0 ? ` (${recipe.make_again_count + 1})` : ''}`}
          </button>
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
                const num = parseFraction(ing.amount);
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

            {/* Nutrition Facts — below ingredients */}
            {recipe.nutrition && (
              <div className="mt-6 print-section">
                <NutritionFactsBox nutrition={recipe.nutrition} servings={recipe.servings ?? 1} />
              </div>
            )}
          </div>

          {/* Right column: Instructions */}
          <div className="lg:col-span-3">

            {/* Instructions */}
            <div className="print-section">
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
