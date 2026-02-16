import React, { useState } from 'react';
// Fix: Correct import path for AppContext
import { useAppContext } from '../../context/AppContext';

const CreateProfileModal: React.FC = () => {
    const { updateProfile, hideModal } = useAppContext();
    const [name, setName] = useState('');

    const handleCreate = () => {
        if (name.trim()) {
            updateProfile({ name });
            hideModal();
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-spartan-gold mb-4">Welcome to Spartan</h2>
            <p className="text-spartan-text-secondary mb-6">Let's get started by creating your profile.</p>
            
            <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-spartan-text-secondary mb-1">Your Name</label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-spartan-card border border-spartan-border rounded-lg p-2 focus:ring-2 focus:ring-spartan-gold focus:outline-none"
                    placeholder="e.g., Leonidas"
                />
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <button
                    onClick={handleCreate}
                    className="py-2 px-4 bg-spartan-gold text-spartan-bg font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                    Create Profile
                </button>
            </div>
        </div>
    );
};

export default CreateProfileModal;
