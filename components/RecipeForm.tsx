'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe, RecipeFormData, Ingredient, Instruction } from '@/types/recipe';

interface RecipeFormProps {
  initialData?: Partial<Recipe>;
  isEdit?: boolean;
}

const emptyIngredient = (): Ingredient => ({ item: '', amount: '', unit: '', notes: '' });
const emptyInstruction = (): Instruction => ({ step: '' });

export default function RecipeForm({ initialData, isEdit = false }: RecipeFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState(initialData?.name ?? '');
  const [servings, setServings] = useState(initialData?.servings ?? 1);
  const [prepTime, setPrepTime] = useState(initialData?.prep_time ?? '');
  const [cookTime, setCookTime] = useState(initialData?.cook_time ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients?.length ? initialData.ingredients : [emptyIngredient()]
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    initialData?.instructions?.length ? initialData.instructions : [emptyInstruction()]
  );

  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => setIngredients(prev => [...prev, emptyIngredient()]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const updateInstruction = (i: number, value: string) => {
    setInstructions(prev => prev.map((ins, idx) => idx === i ? { step: value } : ins));
  };

  const addInstruction = () => setInstructions(prev => [...prev, emptyInstruction()]);
  const removeInstruction = (i: number) => setInstructions(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const filteredIngredients = ingredients.filter(i => i.item.trim());
    const filteredInstructions = instructions.filter(i => i.step.trim());

    const body: RecipeFormData = {
      name,
      servings,
      prep_time: prepTime,
      cook_time: cookTime,
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
      tags,
      notes,
      category,
    };

    try {
      const url = isEdit && initialData ? `/api/recipes/${initialData.id}` : '/api/recipes';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      setSavingMessage(isEdit ? 'Done!' : 'Saving & estimating nutrition…');
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
      setSavingMessage('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Basic Info */}
      <section className="bg-white rounded-xl p-6 border border-espresso/10 space-y-4">
        <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2">Basic Info</h2>

        <div>
          <label className="block text-sm font-medium text-espresso mb-1">Recipe Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
            placeholder="e.g. Grandma's Apple Pie"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-espresso mb-1">Servings *</label>
            <input
              type="number"
              required
              min="1"
              value={servings}
              onChange={e => setServings(parseInt(e.target.value) || 1)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso mb-1">Prep Time</label>
            <input
              type="text"
              value={prepTime}
              onChange={e => setPrepTime(e.target.value)}
              className="input-field"
              placeholder="e.g. 15 min"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso mb-1">Cook Time</label>
            <input
              type="text"
              value={cookTime}
              onChange={e => setCookTime(e.target.value)}
              className="input-field"
              placeholder="e.g. 45 min"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso mb-1">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="input-field"
              placeholder="dessert, easy, vegan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-espresso mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-field"
              placeholder="Breakfast, Dessert, Weeknight Dinner..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-espresso mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="Tips, variations, source..."
          />
        </div>
      </section>

      {/* Ingredients */}
      <section className="bg-white rounded-xl p-6 border border-espresso/10">
        <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2 mb-4">Ingredients</h2>
        <div className="space-y-3">
          {ingredients.map((ing, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-start">
              <input
                type="text"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                className="input-field"
                placeholder="Amt"
              />
              <input
                type="text"
                value={ing.unit}
                onChange={e => updateIngredient(i, 'unit', e.target.value)}
                className="input-field"
                placeholder="Unit"
              />
              <input
                type="text"
                value={ing.item}
                onChange={e => updateIngredient(i, 'item', e.target.value)}
                className="input-field col-span-1 sm:col-span-2"
                placeholder="Ingredient"
              />
              <div className="flex gap-1">
                <input
                  type="text"
                  value={ing.notes}
                  onChange={e => updateIngredient(i, 'notes', e.target.value)}
                  className="input-field flex-grow"
                  placeholder="Notes"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="text-espresso/40 hover:text-red-500 flex-shrink-0 px-1"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-3 text-sm text-caramel hover:text-caramel/80 font-medium"
        >
          + Add Ingredient
        </button>
      </section>

      {/* Instructions */}
      <section className="bg-white rounded-xl p-6 border border-espresso/10">
        <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2 mb-4">Instructions</h2>
        <div className="space-y-3">
          {instructions.map((ins, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-caramel text-espresso flex items-center justify-center font-bold text-sm mt-2">
                {i + 1}
              </span>
              <textarea
                value={ins.step}
                onChange={e => updateInstruction(i, e.target.value)}
                className="input-field flex-grow resize-none"
                rows={2}
                placeholder={`Step ${i + 1}...`}
              />
              <button
                type="button"
                onClick={() => removeInstruction(i)}
                className="text-espresso/40 hover:text-red-500 flex-shrink-0 px-1 mt-2 text-xl"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addInstruction}
          className="mt-3 text-sm text-caramel hover:text-caramel/80 font-medium"
        >
          + Add Step
        </button>
      </section>

      <div className="flex gap-3 items-center">
        <button
          type="submit"
          disabled={saving}
          className="btn-caramel disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Update Recipe' : 'Save Recipe'}
        </button>
        {savingMessage && (
          <span className="text-sm text-espresso/60">{savingMessage}</span>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-espresso/20 text-espresso rounded-lg hover:bg-espresso/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
