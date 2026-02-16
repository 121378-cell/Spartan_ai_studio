import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import FireIcon from './icons/FireIcon.tsx';
import PlusCircleIcon from './icons/PlusCircleIcon.tsx';
import CheckIcon from './icons/CheckIcon.tsx';
import type { KeystoneHabit } from '../types.ts';

const HabitCard: React.FC<{ habit: KeystoneHabit; onComplete: (id: string) => void; isCompletedToday: boolean }> = ({ habit, onComplete, isCompletedToday }) => {
    return (
        <div className={`p-4 rounded-lg flex items-center gap-4 transition-all ${isCompletedToday ? 'bg-spartan-gold/20' : 'bg-spartan-card'}`}>
            <button
                onClick={() => onComplete(habit.id)}
                disabled={isCompletedToday}
                className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                    isCompletedToday 
                        ? 'bg-spartan-gold border-spartan-gold text-spartan-bg' 
                        : 'border-spartan-border bg-spartan-surface hover:bg-spartan-gold/20'
                }`}
            >
                {isCompletedToday ? <CheckIcon className="w-8 h-8"/> : <FireIcon className="w-8 h-8 text-spartan-text-secondary"/>}
            </button>
            <div className="flex-1">
                <h4 className="font-bold text-lg">{habit.name}</h4>
                <p className="text-sm text-spartan-text-secondary italic">Anclaje: {habit.anchor}</p>
            </div>
            <div className="text-center">
                <p className="font-bold text-2xl text-spartan-gold flex items-center gap-1"><FireIcon className="w-6 h-6"/> {habit.currentStreak}</p>
                <p className="text-xs text-spartan-text-secondary">RACHA</p>
            </div>
        </div>
    );
};

const Discipline: React.FC = () => {
    const { userProfile, showModal, logHabitCompletion, addReflection, habitLogs } = useAppContext();
    const today = new Date().toISOString().split('T')[0];

    const todayReflection = userProfile.reflections.find(r => r.date === today);
    const [reflectionText, setReflectionText] = useState(todayReflection?.text || '');

    const handleSaveReflection = () => {
        if (reflectionText.trim()) {
            addReflection(reflectionText);
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-4xl font-bold text-spartan-gold">Forja de la Disciplina</h1>
                <p className="text-lg text-spartan-text-secondary">Pequeñas victorias diarias construyen leyendas.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Habits Section */}
                <div className="lg:col-span-3 bg-spartan-surface p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Hábitos Clave</h2>
                        <button onClick={() => showModal('create-habit')} className="flex items-center gap-2 text-spartan-gold font-semibold hover:text-yellow-300">
                            <PlusCircleIcon className="w-6 h-6" />
                            Añadir Hábito
                        </button>
                    </div>
                    <div className="space-y-4">
                        {userProfile.keystoneHabits.length > 0 ? (
                            userProfile.keystoneHabits.map(habit => {
                                const isCompletedToday = habitLogs.some(log => log.habitId === habit.id && log.date === today);
                                return <HabitCard key={habit.id} habit={habit} onComplete={logHabitCompletion} isCompletedToday={isCompletedToday} />;
                            })
                        ) : (
                            <p className="text-spartan-text-secondary text-center py-4">Añade tu primer hábito para empezar a construir tu racha.</p>
                        )}
                    </div>
                </div>

                {/* Reflection Section */}
                <div className="lg:col-span-2 bg-spartan-surface p-6 rounded-lg">
                     <h2 className="text-2xl font-bold mb-4">Reflexión Rápida</h2>
                     <label htmlFor="reflection" className="block text-sm font-medium text-spartan-text-secondary mb-2">¿Cuál fue tu victoria mental o lección aprendida hoy?</label>
                     <textarea
                        id="reflection"
                        rows={6}
                        value={reflectionText}
                        onChange={(e) => setReflectionText(e.target.value)}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-3 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                        placeholder="Ej: 'Mantuve la calma durante una reunión estresante.' o 'Aprendí a no saltarme el calentamiento.'"
                     />
                     <button onClick={handleSaveReflection} className="w-full mt-4 py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors">
                        Guardar Reflexión
                     </button>
                </div>
            </div>
        </div>
    );
};

export default Discipline;
