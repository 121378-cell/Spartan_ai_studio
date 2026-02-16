import React from 'react';

interface RirSelectorProps {
  value: number | undefined;
  onChange: (newValue: number | undefined) => void;
  size?: 'default' | 'large';
}

const RirSelector: React.FC<RirSelectorProps> = ({ value, onChange, size = 'default' }) => {
  const isLarge = size === 'large';
  const options = [
    { label: '0', value: 0, description: 'Fallo muscular' },
    { label: '1', value: 1, description: '1 rep en reserva' },
    { label: '2', value: 2, description: '2 reps en reserva' },
    { label: '3', value: 3, description: '3 reps en reserva' },
    { label: '4+', value: 4, description: '4 o más reps en reserva' },
  ];

  return (
    <div className={`flex items-center justify-center gap-2 ${isLarge ? 'gap-3' : 'gap-2'}`}>
      {options.map(option => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          className={`font-bold rounded-lg transition-all transform hover:scale-110
            ${isLarge ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'}
            ${value === option.value
              ? 'bg-spartan-gold text-spartan-bg scale-110 shadow-lg'
              : 'bg-spartan-card hover:bg-spartan-border'
            }`}
          title={option.description}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default RirSelector;
