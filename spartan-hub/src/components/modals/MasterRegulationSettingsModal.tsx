import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext.tsx';
import type { MasterRegulationSettings } from '../../types.ts';

const MasterRegulationSettingsModal: React.FC = () => {
    const { hideModal, userProfile, updateMasterRegulationSettings } = useAppContext();
    const [settings, setSettings] = useState<MasterRegulationSettings>(
        userProfile.masterRegulationSettings || { targetBedtime: '22:30' }
    );

    const handleSave = () => {
        updateMasterRegulationSettings(settings);
        hideModal();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Ajustes de Regulación Maestra</h2>
            <p className="text-spartan-text-secondary mb-6">
                Configura tus preferencias para optimizar tu recuperación y sueño.
            </p>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="targetBedtime" className="block text-sm font-medium text-spartan-text-secondary mb-1">Hora Objetivo para Dormir</label>
                    <input
                        id="targetBedtime"
                        type="time"
                        value={settings.targetBedtime}
                        onChange={(e) => setSettings({ ...settings, targetBedtime: e.target.value })}
                        className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                    />
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
                    Guardar Ajustes
                </button>
            </div>
        </div>
    );
};

export default MasterRegulationSettingsModal;
