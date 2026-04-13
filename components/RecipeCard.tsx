'use client';

import React from 'react';
import Link from 'next/link';
import type { Recipe } from '@/types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete?: (id: string) => void;
}

export default function RecipeCard({ recipe, onDelete }: RecipeCardProps) {
  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <Link href={`/recipe/${recipe.id}`} className="block">
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-espresso leading-tight">{recipe.name}</h3>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm(`Delete "${recipe.name}"?`)) onDelete(recipe.id);
                }}
                className="text-espresso/30 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                title="Delete recipe"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
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
