import React from 'react';

interface RpeSliderProps {
  value: number | undefined;
  onChange: (newValue: number) => void;
}

const RpeSlider: React.FC<RpeSliderProps> = ({ value, onChange }) => {
    const rpeLevels = [
        { level: 10, label: "Máximo Esfuerzo Absoluto" },
        { level: 9, label: "Casi Máximo" },
        { level: 8, label: "Muy Duro" },
        { level: 7, label: "Duro" },
        { level: 6, label: "Moderadamente Duro" },
        { level: 5, label: "Moderado" },
        { level: 4, label: "Algo Incómodo" },
        { level: 3, label: "Ligero" },
        { level: 2, label: "Muy Ligero" },
        { level: 1, label: "Casi Nada" },
    ];

    return (
        <div className="flex flex-col-reverse items-stretch gap-1 w-full max-w-[100px]">
            {rpeLevels.map(({ level, label }) => (
                <button
                    key={level}
                    type="button"
                    onClick={() => onChange(level)}
                    className={`py-0.5 text-center font-bold rounded-sm transition-colors text-xs ${
                        value === level
                            ? 'bg-spartan-gold text-spartan-bg'
                            : 'bg-spartan-card hover:bg-spartan-border'
                    }`}
                    title={label}
                >
                    {level}
                </button>
            ))}
        </div>
    );
};

export default RpeSlider;

