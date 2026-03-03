/**
 * Mobile State Management Service
 * Phase C: Mobile Foundation - Week 10 Day 2
 * 
 * Redux-based state management for mobile app
 */

import { logger } from '../utils/logger';

export type SliceType = 'auth' | 'user' | 'workouts' | 'challenges' | 'gamification' | 'settings' | 'ui';
export type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface Slice {
  id: string;
  name: SliceType;
  initialState: Record<string, any>;
  reducers: SliceReducer[];
  selectors: SliceSelector[];
}

export interface SliceReducer {
  name: string;
  type: 'sync' | 'async';
  action: string;
  payload?: any;
}

export interface SliceSelector {
  name: string;
  path: string;
  returnType: string;
}

export interface RootState {
  auth: AuthState;
  user: UserState;
  workouts: WorkoutsState;
  challenges: ChallengesState;
  gamification: GamificationState;
  settings: SettingsState;
  ui: UIState;
}

export interface AuthState {
  status: AsyncStatus;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface UserState {
  status: AsyncStatus;
  profile: UserProfile | null;
  stats: UserStats | null;
  error: string | null;
}

export interface UserProfile {
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  units?: 'metric' | 'imperial';
}

export interface UserStats {
  totalWorkouts: number;
  currentStreak: number;
  bestStreak: number;
  level: number;
  xp: number;
  points: number;
}

export interface WorkoutsState {
  status: AsyncStatus;
  items: Workout[];
  current: Workout | null;
  error: string | null;
}

export interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface ChallengesState {
  status: AsyncStatus;
  items: Challenge[];
  active: Challenge[];
  completed: Challenge[];
  error: string | null;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'active' | 'completed' | 'failed';
}

export interface GamificationState {
  status: AsyncStatus;
  level: number;
  xp: number;
  points: number;
  achievements: Achievement[];
  badges: Badge[];
  dailyQuests: Quest[];
  error: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  rewards: QuestReward[];
}

export interface QuestReward {
  type: 'points' | 'xp' | 'badge';
  value: number | string;
}

export interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  language: string;
  units: 'metric' | 'imperial';
  privacy: 'public' | 'private';
}

export interface UIState {
  loading: boolean;
  error: string | null;
  modal: ModalState | null;
  toast: ToastState | null;
}

export interface ModalState {
  type: string;
  visible: boolean;
  props?: Record<string, any>;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  visible: boolean;
}

/**
 * Mobile State Management Service
 */
export class MobileStateManagementService {
  private slices: Map<string, Slice> = new Map();
  private state: RootState;

  constructor() {
    this.state = this.createInitialState();
    this.initializeDefaultSlices();
    
    logger.info('MobileStateManagementService initialized', {
      context: 'mobile-state',
      metadata: {
        slices: this.slices.size
      }
    });
  }

  /**
   * Create initial state
   */
  private createInitialState(): RootState {
    return {
      auth: {
        status: 'idle',
        user: null,
        token: null,
        refreshToken: null,
        error: null
      },
      user: {
        status: 'idle',
        profile: null,
        stats: null,
        error: null
      },
      workouts: {
        status: 'idle',
        items: [],
        current: null,
        error: null
      },
      challenges: {
        status: 'idle',
        items: [],
        active: [],
        completed: [],
        error: null
      },
      gamification: {
        status: 'idle',
        level: 1,
        xp: 0,
        points: 0,
        achievements: [],
        badges: [],
        dailyQuests: [],
        error: null
      },
      settings: {
        theme: 'auto',
        notifications: true,
        language: 'en',
        units: 'metric',
        privacy: 'public'
      },
      ui: {
        loading: false,
        error: null,
        modal: null,
        toast: null
      }
    };
  }

  /**
   * Initialize default slices
   */
  private initializeDefaultSlices(): void {
    // Auth Slice
    this.createSlice({
      name: 'auth',
      initialState: this.state.auth,
      reducers: [
        { name: 'login', type: 'async', action: 'auth/login' },
        { name: 'logout', type: 'sync', action: 'auth/logout' },
        { name: 'register', type: 'async', action: 'auth/register' },
        { name: 'resetPassword', type: 'async', action: 'auth/resetPassword' }
      ],
      selectors: [
        { name: 'selectUser', path: 'auth.user', returnType: 'User | null' },
        { name: 'selectIsAuthenticated', path: 'auth.token', returnType: 'boolean' },
        { name: 'selectAuthStatus', path: 'auth.status', returnType: 'AsyncStatus' },
        { name: 'selectAuthError', path: 'auth.error', returnType: 'string | null' }
      ]
    });

    // User Slice
    this.createSlice({
      name: 'user',
      initialState: this.state.user,
      reducers: [
        { name: 'fetchProfile', type: 'async', action: 'user/fetchProfile' },
        { name: 'updateProfile', type: 'async', action: 'user/updateProfile' },
        { name: 'fetchStats', type: 'async', action: 'user/fetchStats' }
      ],
      selectors: [
        { name: 'selectProfile', path: 'user.profile', returnType: 'UserProfile | null' },
        { name: 'selectStats', path: 'user.stats', returnType: 'UserStats | null' },
        { name: 'selectUserStatus', path: 'user.status', returnType: 'AsyncStatus' }
      ]
    });

    // Workouts Slice
    this.createSlice({
      name: 'workouts',
      initialState: this.state.workouts,
      reducers: [
        { name: 'fetchWorkouts', type: 'async', action: 'workouts/fetchWorkouts' },
        { name: 'startWorkout', type: 'sync', action: 'workouts/startWorkout' },
        { name: 'endWorkout', type: 'async', action: 'workouts/endWorkout' },
        { name: 'saveWorkout', type: 'async', action: 'workouts/saveWorkout' }
      ],
      selectors: [
        { name: 'selectAllWorkouts', path: 'workouts.items', returnType: 'Workout[]' },
        { name: 'selectCurrentWorkout', path: 'workouts.current', returnType: 'Workout | null' },
        { name: 'selectWorkoutsStatus', path: 'workouts.status', returnType: 'AsyncStatus' }
      ]
    });

    // Challenges Slice
    this.createSlice({
      name: 'challenges',
      initialState: this.state.challenges,
      reducers: [
        { name: 'fetchChallenges', type: 'async', action: 'challenges/fetchChallenges' },
        { name: 'joinChallenge', type: 'async', action: 'challenges/joinChallenge' },
        { name: 'updateProgress', type: 'async', action: 'challenges/updateProgress' }
      ],
      selectors: [
        { name: 'selectAllChallenges', path: 'challenges.items', returnType: 'Challenge[]' },
        { name: 'selectActiveChallenges', path: 'challenges.active', returnType: 'Challenge[]' },
        { name: 'selectChallengesStatus', path: 'challenges.status', returnType: 'AsyncStatus' }
      ]
    });

    // Gamification Slice
    this.createSlice({
      name: 'gamification',
      initialState: this.state.gamification,
      reducers: [
        { name: 'fetchProgress', type: 'async', action: 'gamification/fetchProgress' },
        { name: 'unlockAchievement', type: 'sync', action: 'gamification/unlockAchievement' },
        { name: 'earnBadge', type: 'sync', action: 'gamification/earnBadge' },
        { name: 'updateQuests', type: 'sync', action: 'gamification/updateQuests' },
        { name: 'claimQuestReward', type: 'async', action: 'gamification/claimQuestReward' }
      ],
      selectors: [
        { name: 'selectLevel', path: 'gamification.level', returnType: 'number' },
        { name: 'selectXP', path: 'gamification.xp', returnType: 'number' },
        { name: 'selectPoints', path: 'gamification.points', returnType: 'number' },
        { name: 'selectAchievements', path: 'gamification.achievements', returnType: 'Achievement[]' },
        { name: 'selectDailyQuests', path: 'gamification.dailyQuests', returnType: 'Quest[]' }
      ]
    });

    // Settings Slice
    this.createSlice({
      name: 'settings',
      initialState: this.state.settings,
      reducers: [
        { name: 'updateSettings', type: 'sync', action: 'settings/updateSettings' },
        { name: 'setTheme', type: 'sync', action: 'settings/setTheme' },
        { name: 'toggleNotifications', type: 'sync', action: 'settings/toggleNotifications' }
      ],
      selectors: [
        { name: 'selectTheme', path: 'settings.theme', returnType: 'string' },
        { name: 'selectNotifications', path: 'settings.notifications', returnType: 'boolean' },
        { name: 'selectUnits', path: 'settings.units', returnType: 'string' }
      ]
    });

    // UI Slice
    this.createSlice({
      name: 'ui',
      initialState: this.state.ui,
      reducers: [
        { name: 'setLoading', type: 'sync', action: 'ui/setLoading' },
        { name: 'setError', type: 'sync', action: 'ui/setError' },
        { name: 'showModal', type: 'sync', action: 'ui/showModal' },
        { name: 'hideModal', type: 'sync', action: 'ui/hideModal' },
        { name: 'showToast', type: 'sync', action: 'ui/showToast' },
        { name: 'hideToast', type: 'sync', action: 'ui/hideToast' }
      ],
      selectors: [
        { name: 'selectLoading', path: 'ui.loading', returnType: 'boolean' },
        { name: 'selectError', path: 'ui.error', returnType: 'string | null' },
        { name: 'selectModal', path: 'ui.modal', returnType: 'ModalState | null' },
        { name: 'selectToast', path: 'ui.toast', returnType: 'ToastState | null' }
      ]
    });
  }

  /**
   * Create slice
   */
  createSlice(config: Omit<Slice, 'id'>): Slice {
    const slice: Slice = {
      id: `slice_${config.name}_${Date.now()}`,
      ...config
    };

    this.slices.set(slice.id, slice);

    logger.info('Slice created', {
      context: 'mobile-state',
      metadata: {
        sliceId: slice.id,
        name: slice.name,
        reducers: slice.reducers.length
      }
    });

    return slice;
  }

  /**
   * Get slice by ID
   */
  getSlice(id: string): Slice | null {
    return this.slices.get(id) || null;
  }

  /**
   * Get slice by name
   */
  getSliceByName(name: SliceType): Slice | null {
    return Array.from(this.slices.values())
      .find(s => s.name === name) || null;
  }

  /**
   * Get all slices
   */
  getAllSlices(): Map<string, Slice> {
    return new Map(this.slices);
  }

  /**
   * Get root state
   */
  getState(): RootState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  updateState(sliceName: SliceType, updates: Record<string, any>): boolean {
    if (!this.state[sliceName]) {
      return false;
    }

    (this.state[sliceName] as any) = {
      ...(this.state[sliceName] as any),
      ...updates
    };

    logger.debug('State updated', {
      context: 'mobile-state',
      metadata: {
        sliceName,
        updates: Object.keys(updates)
      }
    });

    return true;
  }

  /**
   * Generate Redux store configuration
   */
  generateStoreConfig(): string {
    const code = `import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import workoutsReducer from './slices/workoutsSlice';
import challengesReducer from './slices/challengesSlice';
import gamificationReducer from './slices/gamificationSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    workouts: workoutsReducer,
    challenges: challengesReducer,
    gamification: gamificationReducer,
    settings: settingsReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;

    return code;
  }

  /**
   * Generate slice template
   */
  generateSliceTemplate(sliceName: string): string {
    const template = `import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../store';

// Types
interface ${sliceName}State {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ${sliceName}State = {
  status: 'idle',
  error: null
};

// Async Thunks
export const fetch${sliceName} = createAsyncThunk(
  '${sliceName}/fetch',
  async (_, { rejectWithValue }) => {
    try {
      // API call here
      return {};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const ${sliceName}Slice = createSlice({
  name: '${sliceName}',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch${sliceName}.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetch${sliceName}.fulfilled, (state, action: PayloadAction<any>) => {
        state.status = 'succeeded';
      })
      .addCase(fetch${sliceName}.rejected, (state, action: PayloadAction<any>) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearError } = ${sliceName}Slice.actions;

// Selectors
export const select${sliceName}Status = (state: RootState) => state.${sliceName}.status;
export const select${sliceName}Error = (state: RootState) => state.${sliceName}.error;

export default ${sliceName}Slice.reducer;
`;

    return template;
  }

  /**
   * Generate hooks
   */
  generateHooks(): string {
    const code = `import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// Use throughout your app instead of plain \`useDispatch\` and \`useSelector\`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Auth hooks
export const useAuth = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => !!state.auth.token);
  const status = useAppSelector((state) => state.auth.status);
  const error = useAppSelector((state) => state.auth.error);
  const dispatch = useAppDispatch();

  return { user, isAuthenticated, status, error, dispatch };
};

// User hooks
export const useUser = () => {
  const profile = useAppSelector((state) => state.user.profile);
  const stats = useAppSelector((state) => state.user.stats);
  const status = useAppSelector((state) => state.user.status);
  const dispatch = useAppDispatch();

  return { profile, stats, status, dispatch };
};

// Workouts hooks
export const useWorkouts = () => {
  const workouts = useAppSelector((state) => state.workouts.items);
  const currentWorkout = useAppSelector((state) => state.workouts.current);
  const status = useAppSelector((state) => state.workouts.status);
  const dispatch = useAppDispatch();

  return { workouts, currentWorkout, status, dispatch };
};

// Gamification hooks
export const useGamification = () => {
  const level = useAppSelector((state) => state.gamification.level);
  const xp = useAppSelector((state) => state.gamification.xp);
  const points = useAppSelector((state) => state.gamification.points);
  const achievements = useAppSelector((state) => state.gamification.achievements);
  const dailyQuests = useAppSelector((state) => state.gamification.dailyQuests);
  const dispatch = useAppDispatch();

  return { level, xp, points, achievements, dailyQuests, dispatch };
};
`;

    return code;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const sliceCount = this.slices.size;
    const isHealthy = sliceCount >= 7; // At least 7 slices

    logger.debug('Mobile state management health check', {
      context: 'mobile-state',
      metadata: {
        healthy: isHealthy,
        sliceCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const mobileStateManagementService = new MobileStateManagementService();

export default mobileStateManagementService;
