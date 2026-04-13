'use client';

import React from 'react';
import { scaleAmount } from '@/lib/fractions';
import type { Ingredient } from '@/types/recipe';

interface IngredientListProps {
  ingredients: Ingredient[];
  scaleRatio: number;
}

export default function IngredientList({ ingredients, scaleRatio }: IngredientListProps) {
  if (!ingredients || ingredients.length === 0) {
    return <p className="text-espresso/60 italic">No ingredients listed.</p>;
  }

  return (
    <ul className="space-y-3">
      {ingredients.map((ing, i) => {
        const scaledAmount = scaleAmount(ing.amount, scaleRatio);
        return (
          <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-espresso/10">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-caramel mt-2" />
            <div className="flex-grow">
              <span className="font-semibold text-espresso mr-2">{scaledAmount}</span>
              <span className="text-espresso/80 mr-2">{ing.unit}</span>
              <span className="text-espresso">{ing.item}</span>
              {ing.notes && (
                <span className="block text-sm text-espresso/50 italic mt-0.5">{ing.notes}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
