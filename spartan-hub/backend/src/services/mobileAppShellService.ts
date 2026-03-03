/**
 * Mobile App Shell Service
 * Phase C: Mobile Foundation - Week 10 Day 2
 * 
 * Mobile app shell, navigation, and basic screen management
 */

import { logger } from '../utils/logger';

export type ScreenType = 'auth' | 'main' | 'modal' | 'bottom-sheet';
export type NavAction = 'push' | 'pop' | 'replace' | 'reset' | 'navigate';

export interface Screen {
  id: string;
  name: string;
  type: ScreenType;
  path: string;
  component: string;
  authenticated: boolean;
  params?: Record<string, any>;
}

export interface NavigationState {
  currentScreen: string;
  history: string[];
  params?: Record<string, any>;
}

export interface AppShell {
  id: string;
  name: string;
  version: string;
  screens: Screen[];
  navigation: NavigationConfig;
  theme: ThemeConfig;
}

export interface NavigationConfig {
  type: 'stack' | 'tabs' | 'drawer';
  initialScreen: string;
  tabs?: TabConfig[];
  drawer?: DrawerConfig;
}

export interface TabConfig {
  id: string;
  name: string;
  icon: string;
  screen: string;
}

export interface DrawerConfig {
  items: DrawerItem[];
  header?: boolean;
  footer?: boolean;
}

export interface DrawerItem {
  id: string;
  label: string;
  icon: string;
  screen: string;
  authenticated: boolean;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    error: string;
    text: string;
    textSecondary: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontFamily: string;
    fontSizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
  };
}

/**
 * Mobile App Shell Service
 */
export class MobileAppShellService {
  private appShells: Map<string, AppShell> = new Map();
  private navigationState: Map<string, NavigationState> = new Map();

  constructor() {
    logger.info('MobileAppShellService initialized', {
      context: 'mobile-app-shell'
    });
  }

  /**
   * Create app shell
   */
  createAppShell(name: string, version: string = '1.0.0'): AppShell {
    const appShell: AppShell = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      version,
      screens: this.createDefaultScreens(),
      navigation: this.createNavigationConfig(),
      theme: this.createDefaultTheme()
    };

    this.appShells.set(appShell.id, appShell);

    logger.info('App shell created', {
      context: 'mobile-app-shell',
      metadata: {
        appId: appShell.id,
        name,
        version,
        screens: appShell.screens.length
      }
    });

    return appShell;
  }

  /**
   * Create default screens
   */
  private createDefaultScreens(): Screen[] {
    return [
      // Auth Screens
      { id: 'screen_login', name: 'Login', type: 'auth', path: 'login', component: 'LoginScreen', authenticated: false },
      { id: 'screen_register', name: 'Register', type: 'auth', path: 'register', component: 'RegisterScreen', authenticated: false },
      { id: 'screen_forgot_password', name: 'ForgotPassword', type: 'auth', path: 'forgot-password', component: 'ForgotPasswordScreen', authenticated: false },
      
      // Main Screens
      { id: 'screen_home', name: 'Home', type: 'main', path: 'home', component: 'HomeScreen', authenticated: true },
      { id: 'screen_workouts', name: 'Workouts', type: 'main', path: 'workouts', component: 'WorkoutsScreen', authenticated: true },
      { id: 'screen_workout_detail', name: 'WorkoutDetail', type: 'main', path: 'workouts/:id', component: 'WorkoutDetailScreen', authenticated: true, params: { workoutId: 'string' } },
      { id: 'screen_form_analysis', name: 'FormAnalysis', type: 'main', path: 'analysis', component: 'FormAnalysisScreen', authenticated: true },
      { id: 'screen_challenges', name: 'Challenges', type: 'main', path: 'challenges', component: 'ChallengesScreen', authenticated: true },
      { id: 'screen_profile', name: 'Profile', type: 'main', path: 'profile', component: 'ProfileScreen', authenticated: true },
      { id: 'screen_settings', name: 'Settings', type: 'main', path: 'settings', component: 'SettingsScreen', authenticated: true },
      
      // Gamification Screens
      { id: 'screen_achievements', name: 'Achievements', type: 'main', path: 'achievements', component: 'AchievementsScreen', authenticated: true },
      { id: 'screen_leaderboard', name: 'Leaderboard', type: 'main', path: 'leaderboard', component: 'LeaderboardScreen', authenticated: true },
      { id: 'screen_daily_quests', name: 'DailyQuests', type: 'main', path: 'quests', component: 'DailyQuestsScreen', authenticated: true },
      
      // Modal Screens
      { id: 'screen_workout_modal', name: 'WorkoutModal', type: 'modal', path: 'workout-modal', component: 'WorkoutModalScreen', authenticated: true },
      { id: 'screen_achievement_modal', name: 'AchievementModal', type: 'modal', path: 'achievement-modal', component: 'AchievementModalScreen', authenticated: true }
    ];
  }

  /**
   * Create navigation configuration
   */
  private createNavigationConfig(): NavigationConfig {
    return {
      type: 'tabs',
      initialScreen: 'Home',
      tabs: [
        { id: 'tab_home', name: 'Home', icon: 'home', screen: 'Home' },
        { id: 'tab_workouts', name: 'Workouts', icon: 'fitness', screen: 'Workouts' },
        { id: 'tab_challenges', name: 'Challenges', icon: 'trophy', screen: 'Challenges' },
        { id: 'tab_profile', name: 'Profile', icon: 'person', screen: 'Profile' }
      ],
      drawer: {
        items: [
          { id: 'drawer_achievements', label: 'Achievements', icon: 'emoji-events', screen: 'Achievements', authenticated: true },
          { id: 'drawer_leaderboard', label: 'Leaderboard', icon: 'leaderboard', screen: 'Leaderboard', authenticated: true },
          { id: 'drawer_quests', label: 'Daily Quests', icon: 'assignment', screen: 'DailyQuests', authenticated: true },
          { id: 'drawer_settings', label: 'Settings', icon: 'settings', screen: 'Settings', authenticated: true }
        ],
        header: true,
        footer: true
      }
    };
  }

  /**
   * Create default theme
   */
  private createDefaultTheme(): ThemeConfig {
    return {
      colors: {
        primary: '#4F46E5',
        secondary: '#7C3AED',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        error: '#EF4444',
        text: '#111827',
        textSecondary: '#6B7280'
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
      },
      typography: {
        fontFamily: 'Inter',
        fontSizes: {
          xs: 12,
          sm: 14,
          md: 16,
          lg: 18,
          xl: 20,
          xxl: 24
        }
      }
    };
  }

  /**
   * Navigate to screen
   */
  navigate(appId: string, screenName: string, action: NavAction = 'push', params?: Record<string, any>): boolean {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      logger.error('App shell not found', {
        context: 'mobile-app-shell',
        metadata: { appId }
      });
      return false;
    }

    const screen = appShell.screens.find(s => s.name === screenName);
    
    if (!screen) {
      logger.error('Screen not found', {
        context: 'mobile-app-shell',
        metadata: { appId, screenName }
      });
      return false;
    }

    // Update navigation state
    const state = this.navigationState.get(appId) || {
      currentScreen: screenName,
      history: []
    };

    if (action === 'push') {
      state.history.push(state.currentScreen);
      state.currentScreen = screenName;
    } else if (action === 'pop') {
      state.currentScreen = state.history.pop() || screenName;
    } else if (action === 'reset') {
      state.history = [];
      state.currentScreen = screenName;
    }

    if (params) {
      state.params = params;
    }

    this.navigationState.set(appId, state);

    logger.info('Navigation executed', {
      context: 'mobile-app-shell',
      metadata: {
        appId,
        screenName,
        action
      }
    });

    return true;
  }

  /**
   * Get current navigation state
   */
  getNavigationState(appId: string): NavigationState | null {
    return this.navigationState.get(appId) || null;
  }

  /**
   * Get app shell
   */
  getAppShell(appId: string): AppShell | null {
    return this.appShells.get(appId) || null;
  }

  /**
   * Get screen by name
   */
  getScreen(appId: string, screenName: string): Screen | null {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      return null;
    }

    return appShell.screens.find(s => s.name === screenName) || null;
  }

  /**
   * Get all screens
   */
  getAllScreens(appId: string): Screen[] {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      return [];
    }

    return appShell.screens;
  }

  /**
   * Get authenticated screens
   */
  getAuthenticatedScreens(appId: string): Screen[] {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      return [];
    }

    return appShell.screens.filter(s => s.authenticated);
  }

  /**
   * Get public screens
   */
  getPublicScreens(appId: string): Screen[] {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      return [];
    }

    return appShell.screens.filter(s => !s.authenticated);
  }

  /**
   * Update theme
   */
  updateTheme(appId: string, theme: Partial<ThemeConfig>): boolean {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      return false;
    }

    appShell.theme = {
      ...appShell.theme,
      ...theme
    };

    logger.info('Theme updated', {
      context: 'mobile-app-shell',
      metadata: { appId }
    });

    return true;
  }

  /**
   * Generate navigation code
   */
  generateNavigationCode(appId: string): string {
    const appShell = this.appShells.get(appId);
    
    if (!appShell) {
      return '';
    }

    const { navigation, screens } = appShell;

    let code = `import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
${navigation.type === 'tabs' ? "import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';" : ''}
${navigation.drawer ? "import { createDrawerNavigator } from '@react-navigation/drawer';" : ''}

const Stack = createNativeStackNavigator();
${navigation.type === 'tabs' ? 'const Tab = createBottomTabNavigator();' : ''}
${navigation.drawer ? 'const Drawer = createDrawerNavigator();' : ''}

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="${navigation.initialScreen}">
${screens.map(screen => `        <Stack.Screen 
          name="${screen.name}" 
          component={${screen.component}}
          options={{ title: '${screen.name}' }}
        />`).join('\n')}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
`;

    return code;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const appCount = this.appShells.size;
    const isHealthy = appCount > 0;

    logger.debug('Mobile app shell health check', {
      context: 'mobile-app-shell',
      metadata: {
        healthy: isHealthy,
        appCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const mobileAppShellService = new MobileAppShellService();

export default mobileAppShellService;
