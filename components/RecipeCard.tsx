'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete?: (id: string) => void;
  onFavoriteToggle?: (id: string, currentFavorite: boolean) => void;
}

export default function RecipeCard({ recipe, onDelete, onFavoriteToggle }: RecipeCardProps) {
  const router = useRouter();

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/recipe/${recipe.id}`);
    setTimeout(() => { window.print(); }, 100);
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <Link href={`/recipe/${recipe.id}`} className="block">
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-espresso leading-tight flex-1 mr-2">{recipe.name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Favorite heart */}
              {onFavoriteToggle && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFavoriteToggle(recipe.id, !!recipe.is_favorite);
                  }}
                  className="text-lg transition-colors hover:scale-110 p-1"
                  title={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {recipe.is_favorite ? '❤️' : '♡'}
                </button>
              )}
              {/* Print button */}
              <button
                onClick={handlePrint}
                className="text-espresso/30 hover:text-caramel transition-colors p-1"
                title="Print recipe"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete "${recipe.name}"?`)) onDelete(recipe.id);
                  }}
                  className="text-espresso/30 hover:text-red-500 transition-colors p-1"
                  title="Delete recipe"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 text-sm text-espresso/60 mb-3">
            {recipe.prep_time && (
              <span>Prep: {recipe.prep_time}</span>
            )}
            {recipe.cook_time && (
              <span>Cook: {recipe.cook_time}</span>
            )}
            <span>{recipe.servings} servings</span>
          </div>

          {/* Stars + Category + Make Again row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Star rating */}
            {recipe.rating ? (
              <div className="flex items-center gap-0.5" aria-label={`${recipe.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`text-sm ${star <= recipe.rating! ? 'text-caramel' : 'text-espresso/20'}`}
                  >
                    {star <= recipe.rating! ? '★' : '☆'}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-espresso/30">No rating</span>
            )}
            {/* Make Again badge */}
            {(recipe.make_again_count ?? 0) > 0 && (
              <span className="px-2 py-0.5 bg-sage/20 text-espresso rounded-full text-xs font-medium">
                Made {recipe.make_again_count}x
              </span>
            )}
            {/* Category badge */}
            {recipe.category && (
              <span className="px-2 py-0.5 bg-sage/20 text-espresso rounded-full text-xs font-medium">
                {recipe.category}
              </span>
            )}
          </div>

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-caramel/20 text-espresso rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {recipe.notes && (
            <p className="text-sm text-espresso/60 italic line-clamp-2">{recipe.notes}</p>
          )}
        </div>
      </Link>
    </div>
  );
}
