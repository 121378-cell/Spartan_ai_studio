import axios from 'axios';

// Get base URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || '';

export const googleFitService = {
    /**
     * Get the Google OAuth URL to start the connection process
     */
    getAuthUrl: async (): Promise<string> => {
        try {
            const response = await axios.get(`${API_URL}/fitness/google/auth`, {
                withCredentials: true
            });
            return response.data.url;
        } catch (error) {
            console.error('Error getting auth URL:', error);
            throw error;
        }
    },

    /**
     * Get daily stats (steps, etc.)
     */
    getDailyStats: async (): Promise<{ steps: number; timestamp: number }> => {
        try {
            const response = await axios.get(`${API_URL}/fitness/google/stats`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('Error getting daily stats:', error);
            throw error;
        }
    },

    /**
     * Check connection status
     */
    getStatus: async (): Promise<{ connected: boolean }> => {
        try {
            const response = await axios.get(`${API_URL}/fitness/google/status`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('Error checking Google Fit status:', error);
            throw error;
        }
    },

    /**
     * Disconnect from Google Fit and revoke tokens
     */
    disconnect: async (): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await axios.post(`${API_URL}/fitness/google/disconnect`, {}, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            console.error('Error disconnecting from Google Fit:', error);
            throw error;
        }
    }
};
