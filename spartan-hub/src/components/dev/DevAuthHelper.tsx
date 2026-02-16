import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const TEST_EMAIL = 'dev_test_user@example.com';
const TEST_PASS = 'TestUser123!';

/**
 * A utility component that automatically logs in or registers a test user
 * when running in development mode, ensuring an authenticated session exists.
 */
export const DevAuthHelper: React.FC = () => {
    const { user, login, loading } = useAuth();

    useEffect(() => {
        const initDevAuth = async () => {
            // Only run in dev mode
            if (!import.meta.env.DEV) return;

            // Give it a moment to stabilize
            if (loading) return;

            if (!user) {
                console.log('[DevAuthHelper] No user found, attempting dev login...');

                // Try to login
                const loginResult = await login(TEST_EMAIL, TEST_PASS);

                if (loginResult.success) {
                    console.log('[DevAuthHelper] Login successful');
                    return;
                }

                // If login fails, try to register
                console.log('[DevAuthHelper] Login failed, attempting to register test user...');
                try {
                    const registerResponse = await fetch('/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: 'Dev Test User',
                            email: TEST_EMAIL,
                            password: TEST_PASS
                        })
                    });

                    if (registerResponse.ok) {
                        console.log('[DevAuthHelper] Registration successful, logging in...');
                        await login(TEST_EMAIL, TEST_PASS);
                    } else {
                        console.error('[DevAuthHelper] Registration failed', await registerResponse.text());
                    }
                } catch (err) {
                    console.error('[DevAuthHelper] Error during registration', err);
                }
            } else {
                console.log('[DevAuthHelper] User already authenticated:', user.email);
            }
        };

        initDevAuth();
    }, [user, loading, login]);

    return null;
};
