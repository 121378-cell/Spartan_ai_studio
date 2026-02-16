import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import LaurelWreathIcon from '../icons/LaurelWreathIcon.tsx';

const AutonomyUnlockedModal: React.FC = () => {
    const { hideModal, setCurrentPage } = useAppContext();

    const handleNavigate = () => {
        setCurrentPage('success-manual');
        hideModal();
    }

    return (
        <div className="text-center">
            <div className="w-20 h-20 bg-spartan-gold rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-bg">
                <LaurelWreathIcon className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">¡Fase de Autonomía Desbloqueada!</h2>
            <p className="text-spartan-text-secondary mb-6">
                Tu consistencia y disciplina te han llevado a un nuevo nivel. Has demostrado que tienes el control.
            </p>

            <div className="bg-spartan-card p-4 rounded-lg text-left space-y-2">
                <p><strong>El rol de SynergyCoach ha cambiado:</strong> Ya no es un instructor diario, sino un 'Consultor de Alto Nivel'.</p>
                <p><strong>Tus check-ins ahora son mensuales:</strong> Para enfocarnos en la estrategia a largo plazo.</p>
                <p><strong>Tu 'Manual de Éxito' está disponible:</strong> Una nueva sección donde la IA resume tus propias claves del éxito.</p>
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={handleNavigate}
                    className="w-full py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Explorar mi Manual
                </button>
            </div>
        </div>
    );
};

export default AutonomyUnlockedModal;

