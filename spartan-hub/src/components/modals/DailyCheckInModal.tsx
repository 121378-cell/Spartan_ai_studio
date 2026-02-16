import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { DailyLog } from '../../types.ts';

const DailyCheckInModal: React.FC = () => {
    const { hideModal, addOrUpdateDailyLog } = useAppContext();
    const [log, setLog] = useState<Omit<DailyLog, 'date'>>({
        nutrition: 0,
        recovery: 0
    });
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSave = async () => {
        if (log.nutrition === 0 || log.recovery === 0) {
            return; 
        }
        setIsSaving(true);
        const today = new Date().toISOString().split('T')[0];
        await addOrUpdateDailyLog({ ...log, date: today });
        // The modal is now closed by the AppContext logic, so no need to call hideModal() here.
        // The component will unmount, so no need to setIsSaving(false).
    };

    const handleSkip = () => {
        hideModal();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">Registro Diario Rápido</h2>
            <p className="text-spartan-text-secondary mb-6">¿Cómo te sientes hoy?</p>
            
            <div className="space-y-6">
                 <div>
                    <p className="font-semibold mb-2 text-center">Nutrición de Ayer</p>
                    <div className="flex justify-between gap-2">
                        {[1, 2, 3, 4, 5].map(v => (
                            <button key={v} type="button" onClick={() => setLog(prev => ({...prev, nutrition: v}))} className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${log.nutrition === v ? 'bg-spartan-gold text-spartan-bg scale-110' : 'bg-spartan-card hover:bg-spartan-border'}`}>{v}</button>
                        ))}
                    </div>
                </div>
                 <div>
                    <p className="font-semibold mb-2 text-center">Recuperación de Anoche (Sueño/Estrés)</p>
                    <div className="flex justify-between gap-2">
                        {[1, 2, 3, 4, 5].map(v => (
                            <button key={v} type="button" onClick={() => setLog(prev => ({...prev, recovery: v}))} className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${log.recovery === v ? 'bg-spartan-gold text-spartan-bg scale-110' : 'bg-spartan-card hover:bg-spartan-border'}`}>{v}</button>
                        ))}
                    </div>
                </div>
            </div>
            
             <div className="flex justify-end items-center gap-4 mt-8">
                <button onClick={handleSkip} className="text-sm text-spartan-text-secondary hover:text-spartan-text">Omitir por ahora</button>
                <button
                    onClick={handleSave}
                    disabled={log.nutrition === 0 || log.recovery === 0 || isSaving}
                    className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-spartan-border disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Analizando...' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};

export default DailyCheckInModal;
