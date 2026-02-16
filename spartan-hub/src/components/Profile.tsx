import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import GeneticProfile from './GeneticProfile.tsx';

const Profile: React.FC = () => {
    const { userProfile } = useAppContext();

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1>Perfil de {userProfile.name}</h1>
            </div>

            {/* Genetic Profile Section */}
            <div className="profile-section">
                <GeneticProfile userId={userProfile.id} />
            </div>
        </div>
    );
};

export default Profile;
