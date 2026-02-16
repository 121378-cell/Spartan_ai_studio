import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import BrainIcon from '../icons/BrainIcon.tsx';
import ZapIcon from '../icons/ZapIcon.tsx';
import { speak } from '../../services/ttsService.ts';

interface CognitiveReframingModalProps {
    reframedMessage: string;
    microAction: string;
}

const CognitiveReframingModal: React.FC<CognitiveReframingModalProps> = ({ reframedMessage, microAction }) => {
    const { hideModal, showModal } = useAppContext();

    useEffect(() => {
        const textToSpeak = `Análisis del Estratega. ${reframedMessage} Ahora, una micro-compensación para recuperar el impulso: ${microAction}`;
        speak(textToSpeak);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [reframedMessage, microAction]);

    const handleMicroAction = () => {
        showModal('micro-victory');
    };

    return (
        <div className="text-center">
            <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                <BrainIcon className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-2">Análisis del Estratega</h2>
            <p className="text-spartan-text-secondary mb-6">
                Un contratiempo no es un fracaso, es información valiosa.
            </p>

            <div className="bg-spartan-card p-4 rounded-lg text-left mb-6">
                <p className="italic">"{reframedMessage}"</p>
            </div>
            
            <div className="bg-spartan-surface p-4 rounded-lg">
                <h3 className="text-lg font-bold text-spartan-gold">Micro-Compensación</h3>
                <p className="text-spartan-text-secondary mt-1 mb-4">Recupera el impulso AHORA con esta acción de 1 minuto:</p>
                 <button
                    onClick={handleMicroAction}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    <ZapIcon className="w-6 h-6" />
                    {microAction}
                </button>
            </div>


            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-6 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
};

export default CognitiveReframingModal;
