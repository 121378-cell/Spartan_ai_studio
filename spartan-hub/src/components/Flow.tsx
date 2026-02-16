import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import FocusIcon from './icons/FocusIcon.tsx';
import ZapIcon from './icons/ZapIcon.tsx';

const ProtocolCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onAction: () => void; actionLabel: string }> = ({ title, description, icon, onAction, actionLabel }) => (
    <div className="bg-spartan-surface p-6 rounded-lg shadow-lg flex flex-col h-full">
        <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 bg-spartan-card rounded-full flex items-center justify-center text-spartan-gold flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="text-2xl font-bold">{title}</h3>
            </div>
        </div>
        <p className="text-spartan-text-secondary flex-grow mb-6">{description}</p>
        <button
            onClick={onAction}
            className="w-full mt-auto bg-spartan-gold text-spartan-bg font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
        >
            {actionLabel}
        </button>
    </div>
);

const QuickProtocol: React.FC<{ title: string; onAction: () => void }> = ({ title, onAction }) => (
    <button onClick={onAction} className="w-full bg-spartan-card p-4 rounded-lg text-left hover:bg-spartan-border transition-colors">
        <p className="font-semibold">{title}</p>
    </button>
);

const Flow: React.FC = () => {
    const { showModal, startFocusSession } = useAppContext();

    const stateTransitionInstructions = {
        eyeNeck: {
            title: "Protocolo de Movimiento Ocular y de Cuello",
            instructions: [
                "1. Siéntate erguido, mira hacia adelante.",
                "2. Sin mover la cabeza, mueve los ojos de extrema izquierda a extrema derecha 5 veces.",
                "3. Sin mover la cabeza, mueve los ojos de arriba hacia abajo 5 veces.",
                "4. Lentamente, gira la cabeza hacia la izquierda lo más que puedas cómodamente, mantén 2 segundos.",
                "5. Repite hacia la derecha.",
                "6. Inclina la oreja izquierda hacia el hombro izquierdo, mantén 2 segundos. Repite a la derecha.",
                "7. Respira profundamente y vuelve a tu tarea."
            ]
        },
        tempContrast: {
            title: "Protocolo de Contraste de Temperatura",
            instructions: [
                "1. Ten a mano un vaso de agua fría.",
                "2. Ponte de pie y estira los brazos por encima de la cabeza.",
                "3. Realiza una exhalación forzada y completa por la boca ('Woooosh').",
                "4. Bebe un sorbo de agua fría, sintiendo la temperatura.",
                "5. Realiza 3 respiraciones profundas y controladas.",
                "6. Vuelve a tu tarea con una perspectiva renovada."
            ]
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-spartan-gold">Protocolos de Flujo</h1>
                <p className="text-lg text-spartan-text-secondary mt-2">Herramientas de neurociencia para dominar tu enfoque y trabajo profundo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Focus Activation */}
                <ProtocolCard
                    title="Activación de Foco (45 min)"
                    description="Inicia un bloque de trabajo profundo inmersivo. La app gestionará tu entorno bloqueando distracciones e inyectando modulación auditiva para maximizar la concentración."
                    icon={<FocusIcon className="w-8 h-8"/>}
                    onAction={startFocusSession}
                    actionLabel="Iniciar Bloque de Foco"
                />

                {/* State Transition */}
                <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
                    <div className="flex items-start gap-4 mb-3">
                        <div className="w-12 h-12 bg-spartan-card rounded-full flex items-center justify-center text-spartan-gold flex-shrink-0">
                            <ZapIcon className="w-8 h-8"/>
                        </div>
                        <div>
                             <h3 className="text-2xl font-bold">Transición de Estado (2 min)</h3>
                        </div>
                    </div>
                    <p className="text-spartan-text-secondary mb-6">Protocolos ultrarrápidos para cambiar de marcha mental, superar la procrastinación o reenfocarte después de una distracción. Úsalos para romper bloqueos y restaurar la atención al instante.</p>
                    <div className="space-y-3">
                        <QuickProtocol 
                            title="Movimiento Ocular y de Cuello"
                            onAction={() => showModal('protocol-instruction', stateTransitionInstructions.eyeNeck)}
                        />
                         <QuickProtocol 
                            title="Respiración y Contraste de Temperatura"
                            onAction={() => showModal('protocol-instruction', stateTransitionInstructions.tempContrast)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Flow;
