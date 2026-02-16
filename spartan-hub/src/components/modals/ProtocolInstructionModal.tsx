import React from 'react';
import { useAppContext } from '../../context/AppContext.tsx';

interface ProtocolInstructionModalProps {
    title: string;
    instructions: string[];
}

const ProtocolInstructionModal: React.FC<ProtocolInstructionModalProps> = ({ title, instructions }) => {
    const { hideModal } = useAppContext();

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">{title}</h2>
            <div className="space-y-2 text-spartan-text-secondary bg-spartan-card p-4 rounded-lg">
                {instructions.map((line, index) => <p key={index}>{line}</p>)}
            </div>
            <div className="flex justify-end mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-6 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Hecho
                </button>
            </div>
        </div>
    );
};

export default ProtocolInstructionModal;
