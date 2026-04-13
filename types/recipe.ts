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
};

export type RecipeFormData = Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
