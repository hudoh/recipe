-- Recipe Manager: Auth & Sharing Migration
-- Run this in Supabase → SQL Editor

-- 1. Add user_id to recipes (no FK yet, add after profiles table exists)
ALTER TABLE recipes ADD COLUMN user_id UUID;

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add FK to recipes AFTER profiles exists
ALTER TABLE recipes ADD CONSTRAINT recipes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Visibility column
ALTER TABLE recipes ADD COLUMN visibility TEXT DEFAULT 'private';

-- 5. Recipe shares table
CREATE TABLE public.recipe_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id, shared_with_user_id)
);

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by all" ON profiles;
CREATE POLICY "Profiles viewable by all" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8. RLS on recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipes readable by owner or if public or if shared with user" ON recipes;
CREATE POLICY "Recipes readable by owner or if public or if shared with user" ON recipes
  FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_id = recipes.id AND shared_with_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Recipes insertable by authenticated users" ON recipes;
CREATE POLICY "Recipes insertable by authenticated users" ON recipes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Recipes updatable by owner" ON recipes;
CREATE POLICY "Recipes updatable by owner" ON recipes
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Recipes deletable by owner" ON recipes;
CREATE POLICY "Recipes deletable by owner" ON recipes
  FOR DELETE USING (user_id = auth.uid());

-- 9. RLS on recipe_shares
ALTER TABLE recipe_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shares viewable by owner and recipient" ON recipe_shares;
CREATE POLICY "Shares viewable by owner and recipient" ON recipe_shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_shares.recipe_id AND user_id = auth.uid())
    OR shared_with_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Shares insertable by recipe owner" ON recipe_shares;
CREATE POLICY "Shares insertable by recipe owner" ON recipe_shares
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Shares deletable by recipe owner" ON recipe_shares;
CREATE POLICY "Shares deletable by recipe owner" ON recipe_shares
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_shares.recipe_id AND user_id = auth.uid())
  );
