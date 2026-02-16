import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import BookIcon from '../icons/BookIcon.tsx';

interface SuccessManualModalProps {
    manualContent: string;
}

const SuccessManualModal: React.FC<SuccessManualModalProps> = ({ manualContent }) => {
    const { hideModal } = useAppContext();

    // Simple parser for '*' emphasis
    const formatContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (line.startsWith('*') && line.endsWith('*')) {
                return <h3 key={i} className="text-xl font-bold text-spartan-gold mt-4 mb-2">{line.slice(1, -1)}</h3>;
            }
            return <p key={i} className="mb-2">{line}</p>;
        });
    };

    return (
        <div>
            <div className="flex flex-col items-center text-center mb-6">
                 <div className="w-20 h-20 bg-spartan-surface rounded-full flex items-center justify-center mx-auto mb-4 text-spartan-gold">
                    <BookIcon className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-spartan-gold">Tu Manual de Éxito Personal</h2>
                <p className="text-sm text-spartan-text-secondary">Una crónica de tu viaje, por el Cronista Spartan.</p>
            </div>

            <div className="bg-spartan-card p-4 rounded-lg text-left max-h-[50vh] overflow-y-auto">
                <div className="whitespace-pre-wrap">
                    {formatContent(manualContent)}
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
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

export default SuccessManualModal;

