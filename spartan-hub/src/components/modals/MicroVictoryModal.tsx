import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import TrophyIcon from '../icons/TrophyIcon.tsx';

const MicroVictoryModal: React.FC = () => {
    const { hideModal } = useAppContext();

    useEffect(() => {
        const timer = setTimeout(() => {
            hideModal();
        }, 2500); // Auto-close after 2.5 seconds

        return () => clearTimeout(timer);
    }, [hideModal]);

    return (
        <div className="text-center p-4">
            <div className="relative inline-block">
                <TrophyIcon className="w-32 h-32 text-spartan-gold animate-celebrate" />
            </div>
            <h2 className="text-3xl font-bold text-spartan-gold mt-4">¡Impulso Recuperado!</h2>
            <p className="text-spartan-text-secondary mt-2">Cada pequeña victoria reconstruye la disciplina.</p>
        </div>
    );
};

export default MicroVictoryModal;

