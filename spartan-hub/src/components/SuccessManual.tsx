import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import BookIcon from './icons/BookIcon.tsx';

const SuccessManual: React.FC = () => {
    const { requestSuccessManual } = useAppContext();

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <div className="text-center">
                <BookIcon className="w-24 h-24 mx-auto text-spartan-gold mb-4" />
                <h1 className="text-5xl font-bold text-spartan-gold">Manual de Éxito Personal</h1>
                <p className="text-xl text-spartan-text-secondary mt-4">
                    Has demostrado una disciplina y constancia excepcionales. Has llegado a la Fase de Autonomía.
                </p>
                <p className="text-lg text-spartan-text-secondary mt-2">
                    Este manual es un espejo de tu viaje, una crónica de tus victorias y la sabiduría que has forjado.
                    No es un plan que te damos, es un reflejo de lo que tú mismo has construido.
                </p>
            </div>

            <div className="mt-12 bg-spartan-surface p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Genera Tu Crónica</h2>
                <p className="text-spartan-text-secondary mb-6">
                    El Cronista Spartan analizará todo tu historial—tus hábitos, tus reflexiones, tus entrenamientos más efectivos—y
                    destilará los principios de tu éxito. Usa este documento para guiar tus decisiones futuras como tu propio coach.
                </p>
                <button
                    onClick={requestSuccessManual}
                    className="bg-spartan-gold text-spartan-bg font-bold py-3 px-8 rounded-lg hover:bg-yellow-500 transition-colors text-lg"
                >
                    Generar Mi Manual de Éxito
                </button>
            </div>
        </div>
    );
};

export default SuccessManual;

