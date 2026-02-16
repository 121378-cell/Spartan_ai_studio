import React from 'react';
import { useAppContext } from '../../context/AppContext';
import SnowflakeIcon from '../icons/SnowflakeIcon';
import ThermometerIcon from '../icons/ThermometerIcon';

const HormesisProtocolModal: React.FC = () => {
    const { hideModal, showToast } = useAppContext();

    const handleSelectProtocol = (protocolName: string) => {
        showToast(`${protocolName} protocol started.`);
        // In a real app, this might trigger a timer or more complex logic.
        hideModal();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Protocolos de Hormesis</h2>
            <p className="text-spartan-text-secondary mb-6">
                Introduce estresores agudos y controlados para fortalecer la resiliencia de tu cuerpo y mente.
            </p>

            <div className="space-y-4">
                <button
                    onClick={() => handleSelectProtocol('Exposición al Frío')}
                    className="w-full flex items-center text-left bg-spartan-card p-4 rounded-lg hover:bg-spartan-border transition-colors"
                >
                    <div className="w-12 h-12 bg-spartan-surface rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0 mr-4">
                        <SnowflakeIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Exposición al Frío</h3>
                        <p className="text-sm text-spartan-text-secondary">Ducha fría de 2-3 minutos para aumentar el estado de alerta y reducir la inflamación.</p>
                    </div>
                </button>
                <button
                    onClick={() => handleSelectProtocol('Exposición al Calor')}
                    className="w-full flex items-center text-left bg-spartan-card p-4 rounded-lg hover:bg-spartan-border transition-colors"
                >
                    <div className="w-12 h-12 bg-spartan-surface rounded-lg flex items-center justify-center text-red-500 flex-shrink-0 mr-4">
                        <ThermometerIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Exposición al Calor</h3>
                        <p className="text-sm text-spartan-text-secondary">Sesión de sauna de 15-20 minutos para mejorar la salud cardiovascular y la desintoxicación.</p>
                    </div>
                </button>
            </div>
             <div className="flex justify-end mt-8">
                <button onClick={hideModal} className="py-2 px-6 bg-spartan-surface hover:bg-spartan-border rounded-lg">
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default HormesisProtocolModal;

