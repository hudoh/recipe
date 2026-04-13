'use client';

import { useState, useEffect } from 'react';
import RecipeCard from '../components/RecipeCard';

// Define types
type Tag = string;
type Recipe = {
  id: string;
  name: string;
  description: string;
  tags: Tag[];
  base_servings: number;
  image_url?: string;
};

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // Get all unique tags
  const getAllTags = (): Tag[] => {
    const allTags: Tag[] = [];
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
        }
      });
    });
    return allTags;
  };

  // Filter recipes based on search and tags
  useEffect(() => {
    let result = [...recipes];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query)
      );
    }
    
    // Filter by selected tags
    if (selectedTags.length > 0) {
      result = result.filter(recipe => 
        recipe.tags.some(tag => selectedTags.includes(tag))
      );
    }
    
    setFilteredRecipes(result);
  }, [recipes, searchQuery, selectedTags]);

  // Toggle tag filter
  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Fetch recipes from API
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        // In a real app, this would call your API
        // For now we'll use mock data to demonstrate the UI
        
        const mockRecipes: Recipe[] = [
          {
            id: '1',
            name: "Claire's Coffee Oreo Ice Cream",
            description: "Rich, creamy, coffee-forward ice cream with crushed Oreos folded in.",
            tags: ['dessert', 'ice cream', 'coffee'],
            base_servings: 6,
          },
          {
            id: '2',
            name: "Classic Beef Lasagna",
            description: "Layered pasta with rich meat sauce and melted cheese.",
            tags: ['dinner', 'comfort food'],
            base_servings: 8,
          },
          {
            id: '3',
            name: "Fresh Berry Smoothie",
            description: "Refreshing blend of seasonal berries and yogurt.",
            tags: ['drink', 'breakfast'],
            base_servings: 4,
          }
        ];
        
        setRecipes(mockRecipes);
        setFilteredRecipes(mockRecipes);
      } catch (error) {
        console.error('Error fetching recipes:', error);
      }
    };

    fetchRecipes();
  }, []);

  const allTags = getAllTags();

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-espresso mb-2">Recipe</h1>
          <p className="text-lg text-espresso/80">Discover and manage your favorite recipes</p>
        </header>

        {/* Search and Filter Section */}
        <div className="mb-8">
          {/* Search Input */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search recipes..."
              className="w-full p-4 pl-12 rounded-lg border border-espresso/20 bg-cream text-espresso focus:outline-none focus:ring-2 focus:ring-caramel"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-espresso/50" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-caramel text-espresso'
                    : 'bg-cream border border-espresso/20 text-espresso hover:bg-espresso/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe}
            />
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-espresso/70">No recipes found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}