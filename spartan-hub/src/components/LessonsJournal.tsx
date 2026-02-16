import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';

const LessonsJournal: React.FC = () => {
    const { userProfile } = useAppContext();
    const journal = userProfile.journal || [];

    const sortedJournal = [...journal].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Diario de Lecciones</h3>
            <div className="bg-spartan-card rounded-lg p-4 h-[358px] overflow-y-auto">
                {sortedJournal.length > 0 ? (
                    <div className="space-y-4">
                        {sortedJournal.map((entry, index) => (
                            <div key={index} className="flex items-start gap-3 animate-fadeIn">
                                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${entry.type === 'ai_reframing' ? 'bg-spartan-gold text-spartan-bg' : 'bg-spartan-surface'}`}>
                                    {entry.type === 'ai_reframing' ? <BrainIcon className="w-5 h-5"/> : <UserIcon className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <p className="font-bold">{entry.title}</p>
                                    <p className="text-xs text-spartan-text-secondary mb-1">
                                        {new Date(entry.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p className="text-sm italic">"{entry.body}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-spartan-text-secondary text-center">Tu diario de lecciones aparecerá aquí a medida que avanzas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonsJournal;
