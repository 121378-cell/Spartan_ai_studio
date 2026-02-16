import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import BackendApiService, { VitalisAlert } from '../services/api.ts';
import OracleIcon from './icons/OracleIcon.tsx';
import PropheticAlert from './PropheticAlert.tsx';

const AlertManager: React.FC = () => {
    const { userProfile } = useAppContext();
    const [alerts, setAlerts] = useState<VitalisAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            if (!userProfile?.id) return;
            setIsLoading(true);
            try {
                const fetchedAlerts = await BackendApiService.getVitalisAlerts(userProfile.id);
                // Filter for high/critical severity alerts that haven't been viewed
                const criticalAlerts = fetchedAlerts.filter(a =>
                    (a.severity === 'high' || a.severity === 'critical') && !a.isViewed
                );
                setAlerts(criticalAlerts);
            } catch (error) {
                console.error('Failed to fetch Vitalis alerts', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlerts();
        // Poll for alerts every 5 minutes
        const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [userProfile?.id]);

    const handleAcknowledge = async (alertId: string) => {
        if (!userProfile?.id) return;
        try {
            await BackendApiService.acknowledgeAlert(userProfile.id, alertId);
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Failed to acknowledge alert', error);
        }
    };

    if (isLoading && alerts.length === 0) return null;
    if (alerts.length === 0) return null;

    return (
        <div className="alert-manager-container w-full">
            {alerts.map(alert => (
                <PropheticAlert
                    key={alert.id}
                    reason={alert.message}
                    onAcknowledge={() => handleAcknowledge(alert.id)}
                />
            ))}
        </div>
    );
};

export default AlertManager;
