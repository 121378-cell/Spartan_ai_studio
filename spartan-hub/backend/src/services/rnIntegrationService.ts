/**
 * React Native Integration Service
 * Phase C: Mobile App Implementation - Week 11 Day 2
 * 
 * API integration, state management, and testing utilities
 */

import { logger } from '../utils/logger';

export interface IntegrationConfig {
  apiBaseUrl: string;
  timeout: number;
  retries: number;
  enableCache: boolean;
  enableLogging: boolean;
  [key: string]: any;
}

export interface TestConfig {
  unitTests: boolean;
  integrationTests: boolean;
  e2eTests: boolean;
  coverageThreshold: number;
}

export interface IntegrationStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * React Native Integration Service
 */
export class RNIntegrationService {
  private config: IntegrationConfig;
  private stats: IntegrationStats;

  constructor(config?: Partial<IntegrationConfig>) {
    this.config = {
      apiBaseUrl: 'https://api.spartanhub.io',
      timeout: 30000,
      retries: 3,
      enableCache: true,
      enableLogging: true,
      ...config
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    logger.info('RNIntegrationService initialized', {
      context: 'rn-integration',
      metadata: this.config
    });
  }

  /**
   * Generate API client
   */
  generateApiClient(): string {
    return `import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = '${this.config.apiBaseUrl}';
const TIMEOUT = ${this.config.timeout};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiError {
  code: string;
  message: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private async loadToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      this.token = token;
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Platform': Platform.OS,
      'X-App-Version': '1.0.0'
    };

    if (this.token) {
      headers['Authorization'] = \`Bearer \${this.token}\`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<ApiResponse<T>> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    const headers = await this.getHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw {
          code: 'API_ERROR',
          message: data.message || 'Request failed',
          status: response.status
        } as ApiError;
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw {
          code: 'TIMEOUT',
          message: 'Request timed out',
          status: 408
        } as ApiError;
      }

      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET');
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', body);
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE');
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
`;
  }

  /**
   * Generate Redux store
   */
  generateReduxStore(): string {
    return `import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import workoutsReducer from './slices/workoutsSlice';
import challengesReducer from './slices/challengesSlice';
import gamificationReducer from './slices/gamificationSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'settings'],
  blacklist: ['ui']
};

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  workouts: workoutsReducer,
  challenges: challengesReducer,
  gamification: gamificationReducer,
  settings: settingsReducer,
  ui: uiReducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
      immutableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
  }

  /**
   * Generate auth slice
   */
  generateAuthSlice(): string {
    return `import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<{\n    user: User;\n    token: string;\n  }>('/auth/login', { email, password });
      if (response.success) {
        await apiClient.setToken(response.data.token);
        return response.data;
      }
      throw new Error(response.message || 'Login failed');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<{\n    user: User;\n    token: string;\n  }>('/auth/register', { email, password, name });
      if (response.success) {
        await apiClient.setToken(response.data.token);
        return response.data;
      }
      throw new Error(response.message || 'Registration failed');
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.post('/auth/logout', {});
      await apiClient.clearToken();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      });
  }
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
`;
  }

  /**
   * Generate test utilities
   */
  generateTestUtilities(): string {
    return `import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../store';

interface RenderWithProvidersOptions {
  preloadedState?: any;
  store?: typeof store;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { preloadedState = {}, store: customStore = store } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={customStore}>
        {children}
      </Provider>
    );
  }

  return { store: customStore, ...render(ui, { wrapper: Wrapper }) };
}

// Mock utilities
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn()
};

export const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn()
};

// Test data generators
export const generateUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  ...overrides
});

export const generateWorkout = (overrides = {}) => ({
  id: 'workout-123',
  type: 'strength',
  duration: 3600,
  calories: 450,
  date: new Date().toISOString(),
  ...overrides
});

export const generateAchievement = (overrides = {}) => ({
  id: 'achievement-123',
  name: 'Test Achievement',
  description: 'Test description',
  unlocked: false,
  progress: 0,
  target: 10,
  ...overrides
});
`;
  }

  /**
   * Generate Jest config
   */
  generateJestConfig(): string {
    return `module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|redux-persist)/)'
  ],
  cacheDirectory: '.jest/cache'
};
`;
  }

  /**
   * Generate test examples
   */
  generateTestExamples(): Record<string, string> {
    return {
      'AuthSlice.test.ts': `import authReducer, { clearError } from '../authSlice';
import { login, register, logout } from '../authSlice';

describe('Auth Slice', () => {
  const initialState = {
    user: null,
    token: null,
    loading: false,
    error: null
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearError', () => {
    const state = {
      ...initialState,
      error: 'Some error'
    };
    expect(authReducer(state, clearError())).toEqual({
      ...initialState,
      error: null
    });
  });

  it('should handle login.pending', () => {
    const state = {
      ...initialState,
      loading: false
    };
    expect(authReducer(state, { type: 'auth/login/pending' })).toEqual({
      ...initialState,
      loading: true,
      error: null
    });
  });

  it('should handle login.fulfilled', () => {
    const payload = {
      user: { id: '1', email: 'test@example.com', name: 'Test', role: 'user' },
      token: 'token-123'
    };
    expect(authReducer(initialState, { type: 'auth/login/fulfilled', payload })).toEqual({
      ...initialState,
      loading: false,
      user: payload.user,
      token: payload.token
    });
  });
});
`,

      'HomeScreen.test.tsx': `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import { renderWithProviders, mockNavigation } from '../../utils/testUtils';

describe('HomeScreen', () => {
  it('should render correctly', () => {
    renderWithProviders(<HomeScreen navigation={mockNavigation} />);
    expect(screen.getByText(/welcome back/i)).toBeTruthy();
  });

  it('should display user stats', () => {
    renderWithProviders(<HomeScreen navigation={mockNavigation} />);
    expect(screen.getByText(/Level/i)).toBeTruthy();
    expect(screen.getByText(/Day Streak/i)).toBeTruthy();
  });

  it('should navigate to workout detail on quick action press', () => {
    renderWithProviders(<HomeScreen navigation={mockNavigation} />);
    const startWorkoutButton = screen.getByText(/Start Workout/i);
    fireEvent.press(startWorkoutButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('WorkoutDetail');
  });

  it('should call logout on logout button press', () => {
    renderWithProviders(<HomeScreen navigation={mockNavigation} />);
    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.press(logoutButton);
    // Verify logout action
  });
});
`,

      'api.test.ts': `import apiClient from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make GET request', async () => {
    const mockData = { success: true, data: { items: [] } };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    ) as jest.Mock;

    const response = await apiClient.get('/test');
    expect(response.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should handle API errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Error' })
      })
    ) as jest.Mock;

    await expect(apiClient.get('/test')).rejects.toThrow();
  });

  it('should handle timeout', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    await expect(apiClient.get('/test')).rejects.toEqual(
      expect.objectContaining({ code: 'TIMEOUT' })
    );
  });
});
`
    };
  }

  /**
   * Get integration stats
   */
  getStats(): IntegrationStats {
    return { ...this.stats };
  }

  /**
   * Update stats
   */
  updateStats(updates: Partial<IntegrationStats>): void {
    this.stats = {
      ...this.stats,
      ...updates
    };
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const isHealthy = true;

    logger.debug('RN Integration health check', {
      context: 'rn-integration',
      metadata: {
        healthy: isHealthy,
        config: this.config
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const rnIntegrationService = new RNIntegrationService();

export default rnIntegrationService;
