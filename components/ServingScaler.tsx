import React from 'react';

interface ServingScalerProps {
  baseServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
}

const ServingScaler: React.FC<ServingScalerProps> = ({ 
  baseServings, 
  currentServings, 
  onServingsChange 
}) => {
  const handleIncrement = () => {
    onServingsChange(currentServings + 1);
  };

  const handleDecrement = () => {
    if (currentServings > 1) {
      onServingsChange(currentServings - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      onServingsChange(value);
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={handleDecrement}
        disabled={currentServings <= 1}
        className="w-10 h-10 rounded-full bg-sage text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage/90 transition-colors"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20 12H4"
          />
        </svg>
      </button>
      
      <input
        type="number"
        min="1"
        value={currentServings}
        onChange={handleInputChange}
        className="mx-4 w-16 text-center border border-espresso/20 rounded-lg bg-cream py-2 text-espresso focus:outline-none focus:ring-2 focus:ring-caramel"
      />
      
      <button
        onClick={handleIncrement}
        className="w-10 h-10 rounded-full bg-caramel text-espresso flex items-center justify-center hover:bg-caramel/90 transition-colors"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
      
      <span className="ml-4 text-espresso/70">
        {currentServings} serving{currentServings !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

export default ServingScaler;