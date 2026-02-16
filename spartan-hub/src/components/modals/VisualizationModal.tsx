import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';

const VisualizationModal: React.FC = () => {
    const { hideModal, modal } = useAppContext();
    const { title, script } = modal.payload || {};

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">{title || "Visualización Guiada"}</h2>
            <div className="space-y-3 text-spartan-text-secondary max-h-64 overflow-y-auto">
                {script ? script.split('\n').map((line: string, index: number) => <p key={index}>{line}</p>) : <p>Cargando visualización...</p>}
            </div>
            <div className="flex justify-end mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default VisualizationModal;

