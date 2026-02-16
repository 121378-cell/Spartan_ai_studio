import React from 'react';
import PlusIcon from './icons/PlusIcon.tsx';
import MinusIcon from './icons/MinusIcon.tsx';

interface NumberStepperProps {
  value: string;
  onChange: (newValue: string) => void;
  step?: number;
  min?: number;
  inputMode?: 'numeric' | 'decimal';
  disabled?: boolean;
  size?: 'default' | 'large';
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, step = 1, min = 0, inputMode = 'decimal', disabled = false, size = 'default' }) => {
  const isLarge = size === 'large';
  const currentValue = parseFloat(value) || 0;

  const handleIncrement = () => {
    if (disabled) return;
    onChange(String(currentValue + step));
  };

  const handleDecrement = () => {
    if (disabled) return;
    const decrementedValue = currentValue - step;
    // Format to avoid floating point inaccuracies with steps like 2.5
    const finalValue = parseFloat(Math.max(min, decrementedValue).toFixed(2));
    onChange(String(finalValue));
  };

  return (
    <div className={`flex items-center justify-center gap-3 bg-spartan-surface p-1 rounded-md ${disabled ? 'opacity-50' : ''} ${isLarge ? 'p-2' : 'p-1'}`}>
      <button type="button" onClick={handleDecrement} disabled={disabled} className={`bg-spartan-card rounded-full hover:bg-spartan-border transition-colors disabled:cursor-not-allowed ${isLarge ? 'p-4' : 'p-2'}`}>
        <MinusIcon className={isLarge ? 'w-6 h-6' : 'w-5 h-5'} />
      </button>
      <input 
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        className={`bg-transparent p-1 rounded-md font-mono text-center focus:outline-none ${isLarge ? 'w-32 text-4xl' : 'w-24 text-xl'}`}
      />
      <button type="button" onClick={handleIncrement} disabled={disabled} className={`bg-spartan-card rounded-full hover:bg-spartan-border transition-colors disabled:cursor-not-allowed ${isLarge ? 'p-4' : 'p-2'}`}>
        <PlusIcon className={isLarge ? 'w-6 h-6' : 'w-5 h-5'} />
      </button>
    </div>
  );
};

export default NumberStepper;
