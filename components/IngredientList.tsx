import React from 'react';

// Define types
type Ingredient = {
  id: string;
  recipe_id: string;
  quantity: number;
  unit: string;
  name: string;
  note?: string;
  order_index: number;
};

interface IngredientListProps {
  baseServings: number;
  currentServings: number;
  ingredients: Ingredient[];
}

// Smart fraction formatter
function formatQuantity(n: number): string {
  const fractions: [number, string][] = [
    [0,'0'],[0.125,'⅛'],[0.25,'¼'],[0.333,'⅓'],[0.375,'⅜'],
    [0.5,'½'],[0.625,'⅝'],[0.667,'⅔'],[0.75,'¾'],[0.875,'⅞'],[1,'1']
  ];
  
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 1000) / 1000;
  
  let best = fractions[0];
  for (const f of fractions) {
    if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) {
      best = f;
    }
  }
  
  if (best[0] === 0) {
    return whole === 0 ? '0' : String(whole);
  }
  
  if (whole === 0) {
    return best[1];
  }
  
  return `${whole} ${best[1]}`;
}

const IngredientList: React.FC<IngredientListProps> = ({ 
  baseServings, 
  currentServings, 
  ingredients 
}) => {
  // Calculate the scaling ratio
  const scaleRatio = currentServings / baseServings;

  return (
    <div className="space-y-4">
      {ingredients.map((ingredient) => {
        // Scale the quantity
        const scaledQuantity = ingredient.quantity * scaleRatio;
        
        return (
          <div 
            key={ingredient.id} 
            className="flex items-start p-4 bg-cream rounded-lg border border-espresso/10"
          >
            <div className="flex-shrink-0 mt-1">
              <div className="w-2 h-2 rounded-full bg-caramel"></div>
            </div>
            
            <div className="ml-4 flex-grow">
              <div className="flex items-baseline">
                <span className="text-lg font-medium text-espresso mr-2">
                  {formatQuantity(scaledQuantity)}
                </span>
                <span className="text-espresso/80 mr-2">
                  {ingredient.unit}
                </span>
                <span className="text-espresso">
                  {ingredient.name}
                </span>
              </div>
              
              {ingredient.note && (
                <p className="text-espresso/60 text-sm mt-1 italic">
                  {ingredient.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default IngredientList;