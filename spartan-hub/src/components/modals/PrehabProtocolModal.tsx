import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { PrehabProtocol } from '../../types.ts';
import BrainIcon from '../icons/BrainIcon.tsx';
import BandAidIcon from '../icons/BandAidIcon.tsx';
import CheckIcon from '../icons/CheckIcon.tsx';

interface PrehabProtocolModalProps {
    protocol: PrehabProtocol;
}

const PrehabProtocolModal: React.FC<PrehabProtocolModalProps> = ({ protocol }) => {
    const { hideModal } = useAppContext();
    const isWarning = protocol.analysis?.toLowerCase().includes('profesional') || false;

    return (
        <div>
            <div className="text-center mb-6">
                 <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                    <BandAidIcon className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-spartan-gold">Protocolo de Pre-habilitación</h2>
            </div>
            
            <div className="space-y-6">
                {/* Analysis */}
                <div className={`p-4 rounded-lg border-l-4 ${isWarning ? 'bg-red-900/50 border-red-500' : 'bg-spartan-card border-spartan-border'}`}>
                    <div className="flex items-start gap-3">
                        <BrainIcon className="w-6 h-6 text-spartan-gold flex-shrink-0 mt-1"/>
                        <div>
                            <h4 className="font-bold text-spartan-gold">Análisis de la IA:</h4>
                            <p className="text-sm italic">{protocol.analysis}</p>
                        </div>
                    </div>
                </div>

                {/* Adjustments & Routine */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-spartan-card p-4 rounded-lg">
                        <h4 className="font-bold text-lg mb-2">Ajustes Inmediatos</h4>
                        <ul className="space-y-2">
                           {(protocol.biomechanicalAdjustments || []).map((adj, i) => (
                               <li key={i} className="flex items-start gap-2 text-sm">
                                   <span className="text-spartan-gold mt-1">→</span>
                                   <span>{adj}</span>
                               </li>
                           ))}
                        </ul>
                    </div>
                     <div className="bg-spartan-card p-4 rounded-lg">
                        <h4 className="font-bold text-lg mb-2">Activación Pre-Entreno</h4>
                        <ul className="space-y-2">
                            {(protocol.prehabRoutine || []).map((ex, i) => (
                                <li key={i} className="text-sm">
                                    <p className="font-semibold">{ex.name}</p>
                                    <p className="text-xs text-spartan-text-secondary">{ex.instruction}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>


            <div className="flex justify-end mt-8">
                <button
                    onClick={hideModal}
                    className="w-full sm:w-auto py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
};

export default PrehabProtocolModal;

