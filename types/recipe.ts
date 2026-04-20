export type Ingredient = {
  item: string;
  amount: string;
  unit: string;
  notes: string;
};

export type Instruction = {
  step: string;
};

export type Nutrition = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  sugar_g?: number;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Visibility = 'private' | 'public' | 'shared';

export type Recipe = {
  id: string;
  name: string;
  servings?: number | null;
  prep_time: string;
  cook_time: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  rating?: number;
  category?: string;
  is_favorite?: boolean;
  make_again_count?: number;
  nutrition?: Nutrition;
  user_id?: string | null;
  visibility?: Visibility;
};

export type RecipeFormData = Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
