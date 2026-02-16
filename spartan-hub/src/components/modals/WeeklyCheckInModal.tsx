import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { WeeklyCheckIn } from '../../types.ts';
import { sanitizeInput, sanitizeNumericInput } from '../../utils/inputSanitizer';

const WeeklyCheckInModal: React.FC = () => {
    const { addWeeklyCheckIn, userProfile } = useAppContext();
    const [formData, setFormData] = useState<Omit<WeeklyCheckIn, 'date'>>({
        weightKg: undefined,
        habitAdherence: 3,
        sleepQuality: 5,
        perceivedStress: 5,
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Sanitize input based on field type
        if (name === 'weightKg' && value) {
            const sanitizedValue = sanitizeNumericInput(value, 20, 500);
            if (sanitizedValue.isValid) {
                setFormData(prev => ({
                    ...prev,
                    [name]: sanitizedValue.value
                }));
            }
        } else if (name === 'notes') {
            // Sanitize text input
            const sanitizedNotes = sanitizeInput(value);
            setFormData(prev => ({
                ...prev,
                [name]: sanitizedNotes
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'weightKg' && value ? parseFloat(value) : value
            }));
        }
    };
    
    const handleSliderChange = (name: keyof typeof formData, value: string) => {
        const numValue = Number(value);
        // Ensure slider values are within valid ranges
        let sanitizedValue = numValue;
        if (name === 'sleepQuality' || name === 'perceivedStress') {
            sanitizedValue = Math.max(0, Math.min(10, numValue));
        } else if (name === 'habitAdherence') {
            sanitizedValue = Math.max(1, Math.min(5, numValue));
        }
        
        setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Sanitize all form data before submitting
        const sanitizedData = {
            ...formData,
            notes: sanitizeInput(formData.notes || '')
        };
        
        addWeeklyCheckIn(sanitizedData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Registro Semanal</h2>
            <p className="text-spartan-text-secondary mb-6">
                Tómate un momento para reflexionar sobre tu semana. Tu feedback es crucial para ajustar la estrategia.
            </p>
            
            <div className="space-y-6">
                <div>
                    <label htmlFor="weightKg" className="block text-sm font-medium text-spartan-text-secondary mb-1">Peso Corporal (kg) - Opcional</label>
                    <input
                        id="weightKg"
                        name="weightKg"
                        type="number"
                        step="0.1"
                        value={formData.weightKg || ''}
                        onChange={handleChange}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                        placeholder="ej: 85.5"
                    />
                </div>
                
                {userProfile.keystoneHabits.length > 0 && (
                     <div>
                        <label className="block text-sm font-medium text-spartan-text-secondary mb-2">Adherencia a '{userProfile.keystoneHabits[0].name}'</label>
                         <div className="flex justify-between gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                                <button key={v} type="button" onClick={() => setFormData(p => ({...p, habitAdherence: v}))} className={`flex-1 p-2 rounded-md font-bold transition-all text-xs ${formData.habitAdherence === v ? 'bg-spartan-gold text-spartan-bg scale-110' : 'bg-spartan-card hover:bg-spartan-border'}`}>{v}</button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="sleepQuality" className="block text-sm font-medium text-spartan-text-secondary">Calidad de Sueño: {formData.sleepQuality}/10</label>
                    <input id="sleepQuality" type="range" min="0" max="10" name="sleepQuality" value={formData.sleepQuality} onChange={(e) => handleSliderChange('sleepQuality', e.target.value)} className="w-full h-2 bg-spartan-border rounded-lg appearance-none cursor-pointer accent-spartan-gold" />
                </div>
                
                <div>
                    <label htmlFor="perceivedStress" className="block text-sm font-medium text-spartan-text-secondary">Estrés Percibido: {formData.perceivedStress}/10</label>
                    <input id="perceivedStress" type="range" min="0" max="10" name="perceivedStress" value={formData.perceivedStress} onChange={(e) => handleSliderChange('perceivedStress', e.target.value)} className="w-full h-2 bg-spartan-border rounded-lg appearance-none cursor-pointer accent-spartan-gold" />
                </div>

                 <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-spartan-text-secondary mb-1">Notas Adicionales (Opcional)</label>
                    <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        value={formData.notes}
                        onChange={handleChange}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                        placeholder="Cualquier cosa a destacar: dolores, picos de energía, etc."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Guardar Registro
                </button>
            </div>
        </form>
    );
};

export default WeeklyCheckInModal;
