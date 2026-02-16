export interface User {
  userId: string;
  role: 'user' | 'reviewer' | 'admin';
  email?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const handleAuthError = (error: any) => {
  if (error.status === 401) {
    throw new AuthError('Sesión expirada o inválida. Por favor, inicie sesión nuevamente.', 401);
  }
  if (error.status === 403) {
    throw new AuthError('No tiene permisos suficientes para realizar esta acción.', 403);
  }
  throw error;
};
