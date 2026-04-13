export type Ingredient = {
  item: string;
  amount: string;
  unit: string;
  notes: string;
};

export type Instruction = {
  step: string;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  prep_time: string;
  cook_time: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  rating?: number;      // 1-5 stars, null/undefined if unrated
  category?: string;     // free-text category (e.g. "Breakfast", "Dessert")
};

export type RecipeFormData = Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
