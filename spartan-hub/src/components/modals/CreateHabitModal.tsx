import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';

const CreateHabitModal: React.FC = () => {
    const { hideModal, addKeystoneHabit, showToast } = useAppContext();
    const [name, setName] = useState('');
    const [anchor, setAnchor] = useState('');
    const [notificationTime, setNotificationTime] = useState('');

    const handleSave = () => {
        if (!name.trim() || !anchor.trim()) {
            showToast("Por favor, completa ambos campos.");
            return;
        }
        addKeystoneHabit({ name, anchor, notificationTime });
        showToast("¡Nuevo hábito añadido!");
        hideModal();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Añadir Hábito Clave</h2>
            <p className="text-spartan-text-secondary mb-6">
                Define un nuevo hábito y ánclalo a una rutina existente para asegurar su éxito.
            </p>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="habitName" className="block text-sm font-medium text-spartan-text-secondary mb-1">Nuevo Hábito</label>
                    <input
                        id="habitName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                        placeholder="Ej: Meditar durante 5 minutos"
                    />
                </div>
                <div>
                    <label htmlFor="habitAnchor" className="block text-sm font-medium text-spartan-text-secondary mb-1">Anclaje (Cuándo lo harás)</label>
                    <input
                        id="habitAnchor"
                        type="text"
                        value={anchor}
                        onChange={(e) => setAnchor(e.target.value)}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                        placeholder="Ej: Después de mi café matutino"
                    />
                </div>
                <div>
                    <label htmlFor="notificationTime" className="block text-sm font-medium text-spartan-text-secondary mb-1">Hora de Recordatorio (Opcional)</label>
                    <input
                        id="notificationTime"
                        type="time"
                        value={notificationTime}
                        onChange={(e) => setNotificationTime(e.target.value)}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                    />
                    <p className="text-xs text-spartan-text-secondary mt-1">Recibe una notificación táctica a esta hora si no has completado el hábito.</p>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={hideModal}
                    className="py-2 px-4 bg-spartan-card hover:bg-spartan-border rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Guardar Hábito
                </button>
            </div>
        </div>
    );
};

export default CreateHabitModal;
