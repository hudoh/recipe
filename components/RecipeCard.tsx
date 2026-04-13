import React from 'react';
import Link from 'next/link';

type Tag = string;

export type Recipe = {
  id: string;
  name: string;
  description: string;
  tags: Tag[];
  base_servings: number;
  image_url?: string;
};

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <Link href={`/recipe/${recipe.id}`} className="block">
      <div className="bg-cream rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-espresso/10">
        {/* Recipe Image */}
        {recipe.image_url ? (
          <img 
            src={recipe.image_url} 
            alt={recipe.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="bg-espresso/10 w-full h-48 flex items-center justify-center">
            <span className="text-espresso/30 text-lg">No Image</span>
          </div>
        )}
        
        {/* Recipe Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-espresso mb-2">{recipe.name}</h3>
          <p className="text-espresso/80 text-sm mb-4 line-clamp-2">{recipe.description}</p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map(tag => (
              <span 
                key={tag} 
                className="px-3 py-1 bg-caramel text-espresso rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          
          {/* Base Servings */}
          <div className="flex items-center text-espresso/70 text-sm">
            <svg 
              className="w-4 h-4 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{recipe.base_servings} servings</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RecipeCard;