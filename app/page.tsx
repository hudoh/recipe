'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RecipeCard from '@/components/RecipeCard';
import type { Recipe } from '@/types/recipe';

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filtered, setFiltered] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecipes(data);
      setFiltered(data);
    } catch {
      setRecipes([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  useEffect(() => {
    let result = [...recipes];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter(r =>
        selectedTags.every(tag => r.tags?.includes(tag))
      );
    }
    if (ratingFilter !== null) {
      result = result.filter(r => (r.rating ?? 0) >= ratingFilter);
    }
    if (categoryFilter.trim()) {
      const q = categoryFilter.toLowerCase();
      result = result.filter(r =>
        r.category?.toLowerCase().includes(q)
      );
    }
    if (showFavoritesOnly) {
      result = result.filter(r => r.is_favorite);
    }
    setFiltered(result);
  }, [recipes, search, selectedTags, ratingFilter, categoryFilter, showFavoritesOnly]);

  const allCategories = Array.from(
    new Set(recipes.flatMap(r => r.category?.trim() ? [r.category] : []))
  ).sort();

  const allTags = Array.from(
    new Set(recipes.flatMap(r => r.tags ?? []))
  ).sort();

  const toggleTag = (tag: string) =>
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );

  const handleDelete = async (id: string) => {
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    fetchRecipes();
  };

  const handleFavoriteToggle = async (id: string, currentFavorite: boolean) => {
    await fetch(`/api/recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !currentFavorite }),
    });
    fetchRecipes();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-espresso text-cream py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">🍳 Recipe Manager</h1>
          <p className="text-cream/70 text-lg">Your personal cookbook with dynamic serving scaling</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-6">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-espresso/20 bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-caramel"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Rating filter */}
          <select
            value={ratingFilter ?? ''}
            onChange={e => setRatingFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2.5 rounded-xl border border-espresso/20 bg-white text-espresso text-sm focus:outline-none focus:ring-2 focus:ring-caramel"
          >
            <option value="">All Ratings</option>
            <option value="5">★★★★★ only</option>
            <option value="4">★★★★+</option>
            <option value="3">★★★+</option>
          </select>

          {/* Category filter */}
          {allCategories.length > 0 ? (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-espresso/20 bg-white text-espresso text-sm focus:outline-none focus:ring-2 focus:ring-caramel"
            >
              <option value="">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Filter by category..."
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-espresso/20 bg-white text-espresso text-sm focus:outline-none focus:ring-2 focus:ring-caramel w-44"
            />
          )}

          <div className="flex gap-2 flex-shrink-0">
            {/* Favorites toggle */}
            <button
              onClick={() => setShowFavoritesOnly(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                showFavoritesOnly
                  ? 'bg-caramel border-caramel text-espresso'
                  : 'border-espresso/20 text-espresso hover:border-caramel bg-white'
              }`}
            >
              <span className="text-base">{showFavoritesOnly ? '❤️' : '♡'}</span>
              Favorites
            </button>

            <Link href="/recipe/new" className="btn-caramel flex items-center gap-2">
              <span className="text-lg">+</span> New Recipe
            </Link>
          </div>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-caramel text-espresso'
                    : 'bg-white border border-espresso/20 text-espresso hover:border-caramel'
                }`}
              >
                {tag}
              </button>
            ))}
            {(selectedTags.length > 0 || ratingFilter !== null || categoryFilter || showFavoritesOnly) && (
              <button
                onClick={() => { setSelectedTags([]); setRatingFilter(null); setCategoryFilter(''); setShowFavoritesOnly(false); }}
                className="px-3 py-1 text-sm text-espresso/50 hover:text-espresso underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Recipe Grid */}
        {loading ? (
          <div className="text-center py-20 text-espresso/50">Loading recipes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            {recipes.length === 0 ? (
              <>
                <p className="text-xl text-espresso/60 mb-4">No recipes yet</p>
                <Link href="/recipe/new" className="btn-caramel">Add your first recipe</Link>
              </>
            ) : (
              <p className="text-espresso/60">No recipes match your search.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onDelete={handleDelete}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
