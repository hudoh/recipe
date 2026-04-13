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

  // Build print-only ingredient markup using current scaled values
  const printIngredients = recipe.ingredients?.map((ing, i) => {
    const scaledAmount = (() => {
      const num = parseFloat(ing.amount);
      if (isNaN(num)) return ing.amount;
      const scaled = num * scaleRatio;
      // Nice display: show integers without decimal, fractions as decimals
      return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, '');
    })();
    return { ...ing, scaledAmount };
  });

  return (
    <div className="min-h-screen">
      {/* Header — wrapped in print-recipe so it prints */}
      <header className="print-recipe bg-espresso text-cream py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="no-print text-cream/60 hover:text-cream text-sm mb-4 inline-flex items-center gap-1">
            ← Back to recipes
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="print-title text-3xl font-bold mb-2">{recipe.name}</h1>
              <div className="print-meta flex flex-wrap gap-3 text-sm text-cream/70">
                {recipe.prep_time && <span>Prep: {recipe.prep_time}</span>}
                {recipe.cook_time && <span>Cook: {recipe.cook_time}</span>}
                <span>Serves {currentServings}</span>
              </div>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="print-tags no-print flex flex-wrap gap-2 mt-3">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-cream/10 text-cream/80 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
        {/* Serving Scaler — hidden from print */}
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
              Ingredients {scaleRatio !== 1 && <span className="text-caramel text-base font-normal">(×{scaleRatio.toFixed(2)})</span>}
            </h2>
            <IngredientList ingredients={recipe.ingredients ?? []} scaleRatio={scaleRatio} />
          </div>

          {/* Instructions */}
          <div className="lg:col-span-3 print-section">
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

      {/* Hidden print-only markup — clean recipe card for printing */}
      <div className="print-recipe" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '22pt', fontWeight: 'bold', color: '#2C1810', marginBottom: '6pt' }}>
          {recipe.name}
        </h1>
        <div className="print-meta" style={{ fontSize: '10pt', color: '#444', display: 'flex', gap: '16pt', marginBottom: '8pt' }}>
          {recipe.prep_time && <span>Prep: {recipe.prep_time}</span>}
          {recipe.cook_time && <span>Cook: {recipe.cook_time}</span>}
          <span>Serves {currentServings}</span>
        </div>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="print-tags" style={{ display: 'flex', gap: '6pt', flexWrap: 'wrap', marginBottom: '8pt' }}>
            {recipe.tags.map(tag => (
              <span key={tag} style={{ fontSize: '8pt', background: '#eee', color: '#333', borderRadius: '3pt', padding: '1pt 6pt' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {recipe.notes && (
          <p style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic', marginBottom: '10pt', borderTop: '0.5pt solid #ccc', paddingTop: '6pt' }}>
            {recipe.notes}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20pt' }}>
          <div>
            <h2 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#2C1810', borderBottom: '1pt solid #D4956A', paddingBottom: '3pt', marginBottom: '8pt' }}>Ingredients</h2>
            <ul className="print-ingredients" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {printIngredients?.map((ing, i) => (
                <li key={i} className="print-ingredient-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '6pt', padding: '3pt 0', borderBottom: '0.25pt solid #eee', fontSize: '10pt' }}>
                  <div className="print-ingredient-dot" style={{ width: '4pt', height: '4pt', borderRadius: '50%', background: '#D4956A', flexShrink: 0, marginTop: '5pt' }} />
                  <div className="print-ingredient-content">
                    <span className="print-ingredient-amount" style={{ fontWeight: 'bold' }}>{ing.scaledAmount}</span>
                    {' '}<span className="print-ingredient-unit">{ing.unit}</span>
                    <span className="print-ingredient-item-name"> {ing.item}</span>
                    {ing.notes && <span className="print-ingredient-notes"> — {ing.notes}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#2C1810', borderBottom: '1pt solid #D4956A', paddingBottom: '3pt', marginBottom: '8pt' }}>Instructions</h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipe.instructions?.map((ins, i) => (
                <li key={i} className="print-instruction-item" style={{ display: 'flex', gap: '10pt', marginBottom: '8pt', alignItems: 'flex-start' }}>
                  <div className="print-instruction-number" style={{ width: '18pt', height: '18pt', borderRadius: '50%', background: '#D4956A', color: '#2C1810', fontSize: '9pt', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p className="print-instruction-step" style={{ fontSize: '10pt', lineHeight: '1.5', color: '#111', paddingTop: '1pt' }}>{ins.step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        {recipe.source_url && (
          <p className="print-source" style={{ fontSize: '8pt', color: '#888', marginTop: '16pt', paddingTop: '8pt', borderTop: '0.5pt solid #ddd' }}>
            Source: <a href={recipe.source_url} style={{ color: '#888' }}>{recipe.source_url}</a>
          </p>
        )}
      </div>
    </div>
  );
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
