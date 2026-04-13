import RecipeForm from '@/components/RecipeForm';

export const metadata = { title: 'New Recipe — Recipe Manager' };

export default function NewRecipePage() {
  return (
    <div className="min-h-screen">
      <header className="bg-espresso text-cream py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Add New Recipe</h1>
          <p className="text-cream/60 mt-1">Fill in the details below to add a recipe to your cookbook</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <RecipeForm />
      </main>
    </div>
  );
}
