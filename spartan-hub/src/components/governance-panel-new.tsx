import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { logger } from '../utils/logger';
import { getAuthHeaders, handleAuthError, AuthError } from '../utils/auth';
import { useAuth } from '../hooks/useAuth';

interface GovernanceData {
  security?: {
    status: string;
    lastCheck: string;
  };
  health?: {
    status: string;
  };
}

export const GovernancePanel: React.FC = () => {
  const [data, setData] = useState<GovernanceData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new AuthError('No hay sesión activa', 401);
      }

      const headers = getAuthHeaders();
      const fetchOptions = {
        headers,
        credentials: 'include' as RequestCredentials
      };

      // Fetch health status (requires user role)
      if (user?.role) {
        const healthResponse = await fetch('/api/governance/health', fetchOptions);
        if (!healthResponse.ok) {
          throw await handleAuthError(healthResponse);
        }
        const healthData = await healthResponse.json();
        setData(prev => ({ ...prev, health: healthData }));
      }

      // Fetch security status (requires reviewer/admin role)
      if (user?.role === 'reviewer' || user?.role === 'admin') {
        const securityResponse = await fetch('/api/governance/security', fetchOptions);
        if (!securityResponse.ok) {
          throw await handleAuthError(securityResponse);
        }
        const securityData = await securityResponse.json();
        setData(prev => ({ ...prev, security: securityData }));
      }
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Error al cargar los datos de gobernanza');
        logger.error('Governance fetch error:', { metadata: { error: err instanceof Error ? err.message : String(err) } });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, user?.role]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Panel de Gobernanza
      </Typography>
      
      {data.health && (
        <Box mb={2}>
          <Typography variant="h6">Estado del Sistema</Typography>
          <Typography>Estado: {data.health.status}</Typography>
        </Box>
      )}

      {data.security && (
        <Box mb={2}>
          <Typography variant="h6">Estado de Seguridad</Typography>
          <Typography>Estado: {data.security.status}</Typography>
          <Typography>Última verificación: {new Date(data.security.lastCheck).toLocaleString()}</Typography>
        </Box>
      )}

      {!data.health && !data.security && (
        <Alert severity="info">
          No tiene acceso a información de gobernanza. Contacte al administrador si necesita acceso.
        </Alert>
      )}
    </Box>
  );
};
