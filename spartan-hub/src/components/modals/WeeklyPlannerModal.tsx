import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { Routine, ScheduledWorkout, TrainingCycle } from '../../types.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';
import OrchestraIcon from '../icons/OrchestraIcon.tsx';
import AlertTriangleIcon from '../icons/AlertTriangleIcon.tsx';

type PlannerState = 'daySelection' | 'processing' | 'confirmation' | 'minFrequencyError' | 'maxFrequencyWarning';

type GeneratedSchedule = {
    date: string;
    routineId: string;
    routineName: string;
    routineFocus: string;
}

const minFrequencies: Record<TrainingCycle['phase'], number> = {
    adaptation: 2,
    hypertrophy: 3,
    strength: 3,
};

const WeeklyPlannerModal: React.FC = () => {
    const { hideModal, routines, saveWeeklySchedule, userProfile } = useAppContext();
    const [state, setState] = useState<PlannerState>('daySelection');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<GeneratedSchedule[]>([]);

    const weekDays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const currentPhase = userProfile.trainingCycle?.phase || 'adaptation';
    const minRequiredDays = minFrequencies[currentPhase];

    const toggleDay = (day: string) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleGenerateScore = () => {
        if (selectedDays.length < minRequiredDays) {
            setState('minFrequencyError');
            return;
        }
        if (selectedDays.length > 5) {
            setState('maxFrequencyWarning');
            return;
        }
        proceedWithGeneration();
    };

    const proceedWithGeneration = () => {
        setState('processing');
        
        setTimeout(() => {
            // --- LDC1.3 Strategic Distribution Logic ---
            const isHighStress = (focus: string): boolean => {
                const highStressKeywords = ['fuerza', 'hiit', 'resistencia'];
                const lowerCaseFocus = focus.toLowerCase();
                return highStressKeywords.some(keyword => lowerCaseFocus.includes(keyword));
            };
    
            // 1. Setup
            const routinesPool: Routine[] = [...routines];
            const today = new Date();
            const todayIndex = (today.getDay() + 6) % 7; // Mon=0, Sun=6
            const daysUntilNextMonday = 7 - todayIndex;
    
            const nextMondayDate = new Date();
            nextMondayDate.setDate(today.getDate() + daysUntilNextMonday);
            nextMondayDate.setHours(0, 0, 0, 0);
    
            const nextWeekDates = weekDays.map((day, i) => {
                const date = new Date(nextMondayDate);
                date.setDate(date.getDate() + i);
                return { day, date: date.toISOString().split('T')[0] };
            });
    
            const slots: { day: string; date: string; routine: Routine | null }[] = nextWeekDates
                .filter(d => selectedDays.includes(d.day))
                .map(d => ({ ...d, routine: null }));
    
            const routinesByFocus = routinesPool.reduce((acc, r) => {
                const focus = r.focus;
                if (!acc[focus]) acc[focus] = [];
                acc[focus].push(r);
                return acc;
            }, {} as Record<string, Routine[]>);
    
            const highStressGroups = Object.entries(routinesByFocus)
                .filter(([focus]) => isHighStress(focus))
                .sort((a, b) => b[1].length - a[1].length);
    
            const routinesToPlace = new Set(routinesPool.filter(r => slots.length > 0));

            // 2. Place repeated high-stress routines for max spacing
            if (highStressGroups.length > 0 && highStressGroups[0][1].length > 1) {
                const mainGroup = highStressGroups[0][1];
                mainGroup.forEach((routine, index) => {
                    let slotIndex = -1;
                    if (index % 2 === 0) { // even index -> place at start
                        slotIndex = slots.findIndex(s => s.routine === null);
                    } else { // odd index -> place at end
                        // FIX: Replace 'findLastIndex' with a reverse loop for wider compatibility, resolving the "Property 'findLastIndex' does not exist" error.
                        let lastIndex = -1;
                        for (let i = slots.length - 1; i >= 0; i--) {
                            if (slots[i].routine === null) {
                                lastIndex = i;
                                break;
                            }
                        }
                        slotIndex = lastIndex;
                    }
                    
                    if (slotIndex !== -1 && slots[slotIndex]) {
                        slots[slotIndex].routine = routine;
                        routinesToPlace.delete(routine);
                    }
                });
            }
            
            // 3. Place remaining routines (high-stress first)
            const remainingRoutines = Array.from(routinesToPlace).sort((a, b) => {
                const aStress = isHighStress(a.focus);
                const bStress = isHighStress(b.focus);
                if (aStress && !bStress) return -1;
                if (!aStress && bStress) return 1;
                return 0; // maintain original order otherwise
            });
            
            remainingRoutines.forEach(routine => {
                let bestSlotIndex = -1;
                let bestSlotScore = -Infinity;
    
                slots.forEach((slot, index) => {
                    if (slot.routine !== null) return;
    
                    let score = 0;
                    const prevSlot = slots[index - 1];
                    const nextSlot = slots[index + 1];
    
                    if (prevSlot?.routine && isHighStress(routine.focus) && isHighStress(prevSlot.routine.focus)) {
                        score -= 100;
                    }
                     if (nextSlot?.routine && isHighStress(routine.focus) && isHighStress(nextSlot.routine.focus)) {
                        score -= 100;
                    }
    
                    if (score > bestSlotScore) {
                        bestSlotScore = score;
                        bestSlotIndex = index;
                    }
                });
    
                if (bestSlotIndex !== -1) {
                    slots[bestSlotIndex].routine = routine;
                }
            });
            
            // 4. Format for display
            const newSchedule: GeneratedSchedule[] = slots
                .filter(s => s.routine !== null)
                .map(s => ({
                    date: s.date,
                    routineId: s.routine!.id,
                    routineName: s.routine!.name,
                    routineFocus: s.routine!.focus,
                }));
    
            setSchedule(newSchedule);
            setState('confirmation');
    
        }, 1500);
    };

    const handleConfirm = () => {
        const finalSchedule: ScheduledWorkout[] = schedule.map(s => ({
            date: s.date,
            routineId: s.routineId
        }));
        saveWeeklySchedule(finalSchedule);
        hideModal();
    };

    const renderContent = () => {
        switch (state) {
            case 'daySelection':
                return (
                    <>
                        <p className="text-lg text-spartan-text-secondary mb-6">Comprométete con tus días de entrenamiento para la próxima semana. El Director orquestará la secuencia óptima para maximizar la recuperación y el progreso.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            {weekDays.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    className={`p-4 rounded-lg border-2 font-bold capitalize transition-colors ${selectedDays.includes(day) ? 'bg-spartan-gold text-spartan-bg border-spartan-gold' : 'bg-spartan-card border-spartan-border'}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleGenerateScore} disabled={selectedDays.length === 0} className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border">
                                Componer Partitura
                            </button>
                        </div>
                    </>
                );
            case 'minFrequencyError':
                 return (
                    <div className="text-center min-h-[250px] flex flex-col justify-center items-center">
                        <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mb-4"/>
                        <h3 className="text-xl font-bold">Frecuencia Insuficiente</h3>
                        <p className="text-spartan-text-secondary mt-2 max-w-md">
                            Tu objetivo actual de <strong className="capitalize">{currentPhase}</strong> requiere una frecuencia de al menos <strong>{minRequiredDays} días/semana</strong>. Por favor, ajusta tu compromiso.
                        </p>
                        <button onClick={() => setState('daySelection')} className="mt-6 py-2 px-6 bg-spartan-card hover:bg-spartan-border rounded-lg">Volver a Seleccionar</button>
                    </div>
                );
            case 'maxFrequencyWarning':
                return (
                    <div className="text-center min-h-[250px] flex flex-col justify-center items-center">
                         <AlertTriangleIcon className="w-12 h-12 text-red-500 mb-4"/>
                         <h3 className="text-xl font-bold">Riesgo de Desgaste</h3>
                         <p className="text-spartan-text-secondary mt-2 max-w-md">
                            Has seleccionado <strong>{selectedDays.length} días</strong>. Entrenar con esta frecuencia aumenta el riesgo de sobreentrenamiento y puede comprometer la recuperación. ¿Estás seguro de que quieres continuar?
                        </p>
                        <div className="flex gap-4 mt-6">
                             <button onClick={() => setState('daySelection')} className="py-2 px-6 bg-spartan-card hover:bg-spartan-border rounded-lg">Atrás</button>
                             <button onClick={proceedWithGeneration} className="py-2 px-6 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500">Continuar de Todos Modos</button>
                        </div>
                    </div>
                );
            case 'processing':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[250px]">
                        <LoadingSpinner />
                        <p className="mt-4 text-spartan-text-secondary">Componiendo tu partitura semanal...</p>
                    </div>
                );
            case 'confirmation':
                return (
                    <>
                         <p className="text-lg text-spartan-text-secondary mb-6">Esta es la partitura para la semana, optimizada para la recuperación. ¿Confirmas tu compromiso?</p>
                         <div className="space-y-3 bg-spartan-card p-4 rounded-lg max-h-60 overflow-y-auto">
                            {schedule.length > 0 ? schedule.map(s => (
                                <div key={s.date} className="flex justify-between items-center p-2 bg-spartan-surface rounded">
                                    <div>
                                        <p className="font-bold capitalize">{new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}</p>
                                        <p className="text-sm text-spartan-text-secondary">{s.routineName}</p>
                                    </div>
                                    <span className="text-xs font-semibold bg-spartan-gold/20 text-spartan-gold px-2 py-1 rounded-full">{s.routineFocus}</span>
                                </div>
                            )) : (
                                <p className="text-center text-spartan-text-secondary">No hay rutinas para asignar a los días seleccionados.</p>
                            )}
                         </div>
                         <div className="flex justify-end gap-4 mt-8">
                            <button onClick={() => setState('daySelection')} className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg">Atrás</button>
                            <button onClick={handleConfirm} disabled={schedule.length === 0} className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 disabled:bg-spartan-border">Confirmar Partitura</button>
                        </div>
                    </>
                );
        }
    };


    return (
        <div>
            <div className="text-center mb-6">
                <OrchestraIcon className="w-16 h-16 mx-auto text-spartan-gold mb-4" />
                <h2 className="text-3xl font-bold text-spartan-gold">Planificador Semanal</h2>
            </div>
            {renderContent()}
        </div>
    );
};

export default WeeklyPlannerModal;
