/**
 * React Native Navigation Service
 * Phase C: Mobile App Implementation - Week 11 Day 1
 * 
 * React Navigation configuration and setup
 */

import { logger } from '../utils/logger';

export type NavigatorType = 'stack' | 'bottom-tabs' | 'material-top-tabs' | 'drawer';
export type ScreenType = 'auth' | 'main' | 'modal' | 'feature';

export interface NavigationConfig {
  initialRoute: string;
  navigatorType: NavigatorType;
  screens: NavigationScreen[];
  linking: DeepLinkingConfig;
  theme: NavigationTheme;
}

export interface NavigationScreen {
  name: string;
  component: string;
  type: ScreenType;
  path?: string;
  options: ScreenOptions;
}

export interface ScreenOptions {
  title?: string;
  headerShown?: boolean;
  tabBarIcon?: string;
  tabBarLabel?: string;
  drawerIcon?: string;
  drawerLabel?: string;
}

export interface DeepLinkingConfig {
  prefixes: string[];
  config: {
    screens: Record<string, string>;
  };
}

export interface NavigationTheme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
}

/**
 * React Native Navigation Service
 */
export class RNNavigationService {
  private configs: Map<string, NavigationConfig> = new Map();

  constructor() {
    logger.info('RNNavigationService initialized', {
      context: 'rn-navigation'
    });
  }

  /**
   * Create navigation configuration
   */
  createNavigationConfig(name: string, type: NavigatorType = 'bottom-tabs'): NavigationConfig {
    const config: NavigationConfig = {
      initialRoute: 'Home',
      navigatorType: type,
      screens: this.createDefaultScreens(),
      linking: this.createDeepLinkingConfig(),
      theme: this.createDefaultTheme()
    };

    this.configs.set(name, config);

    logger.info('Navigation config created', {
      context: 'rn-navigation',
      metadata: {
        name,
        type,
        screens: config.screens.length
      }
    });

    return config;
  }

  /**
   * Create default screens
   */
  private createDefaultScreens(): NavigationScreen[] {
    return [
      // Auth Screens
      {
        name: 'Login',
        component: 'LoginScreen',
        type: 'auth',
        path: 'login',
        options: {
          title: 'Login',
          headerShown: false
        }
      },
      {
        name: 'Register',
        component: 'RegisterScreen',
        type: 'auth',
        path: 'register',
        options: {
          title: 'Register',
          headerShown: false
        }
      },
      {
        name: 'ForgotPassword',
        component: 'ForgotPasswordScreen',
        type: 'auth',
        path: 'forgot-password',
        options: {
          title: 'Forgot Password',
          headerShown: true
        }
      },

      // Main Tabs
      {
        name: 'Home',
        component: 'HomeScreen',
        type: 'main',
        path: 'home',
        options: {
          title: 'Home',
          tabBarIcon: 'home',
          tabBarLabel: 'Home'
        }
      },
      {
        name: 'Workouts',
        component: 'WorkoutsScreen',
        type: 'main',
        path: 'workouts',
        options: {
          title: 'Workouts',
          tabBarIcon: 'fitness',
          tabBarLabel: 'Workouts'
        }
      },
      {
        name: 'Challenges',
        component: 'ChallengesScreen',
        type: 'main',
        path: 'challenges',
        options: {
          title: 'Challenges',
          tabBarIcon: 'trophy',
          tabBarLabel: 'Challenges'
        }
      },
      {
        name: 'Profile',
        component: 'ProfileScreen',
        type: 'main',
        path: 'profile',
        options: {
          title: 'Profile',
          tabBarIcon: 'person',
          tabBarLabel: 'Profile'
        }
      },

      // Feature Screens
      {
        name: 'WorkoutDetail',
        component: 'WorkoutDetailScreen',
        type: 'feature',
        path: 'workouts/:id',
        options: {
          title: 'Workout Details',
          headerShown: true
        }
      },
      {
        name: 'FormAnalysis',
        component: 'FormAnalysisScreen',
        type: 'feature',
        path: 'analysis',
        options: {
          title: 'Form Analysis',
          headerShown: true
        }
      },
      {
        name: 'Achievements',
        component: 'AchievementsScreen',
        type: 'feature',
        path: 'achievements',
        options: {
          title: 'Achievements',
          headerShown: true
        }
      },
      {
        name: 'DailyQuests',
        component: 'DailyQuestsScreen',
        type: 'feature',
        path: 'quests',
        options: {
          title: 'Daily Quests',
          headerShown: true
        }
      },
      {
        name: 'Settings',
        component: 'SettingsScreen',
        type: 'feature',
        path: 'settings',
        options: {
          title: 'Settings',
          headerShown: true
        }
      }
    ];
  }

  /**
   * Create deep linking configuration
   */
  private createDeepLinkingConfig(): DeepLinkingConfig {
    return {
      prefixes: ['spartanhub://', 'https://spartanhub.io'],
      config: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          Home: 'home',
          Workouts: 'workouts',
          'WorkoutDetail': 'workouts/:id',
          Challenges: 'challenges',
          Profile: 'profile',
          FormAnalysis: 'analysis',
          Achievements: 'achievements',
          DailyQuests: 'quests',
          Settings: 'settings'
        }
      }
    };
  }

  /**
   * Create default theme
   */
  private createDefaultTheme(): NavigationTheme {
    return {
      dark: false,
      colors: {
        primary: '#4F46E5',
        background: '#F9FAFB',
        card: '#FFFFFF',
        text: '#111827',
        border: '#E5E7EB',
        notification: '#EF4444'
      }
    };
  }

  /**
   * Get navigation config
   */
  getNavigationConfig(name: string): NavigationConfig | null {
    return this.configs.get(name) || null;
  }

  /**
   * Get all configs
   */
  getAllConfigs(): Map<string, NavigationConfig> {
    return new Map(this.configs);
  }

  /**
   * Generate navigation code
   */
  generateNavigationCode(configName: string): string {
    const config = this.configs.get(configName);
    
    if (!config) {
      return '';
    }

    const { screens, linking, theme } = config;

    const code = `import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
${screens.map(s => `import { ${s.component} } from '../screens/${this.getScreenFolder(s.type)}/${s.component}';`).join('\n')}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '${theme.colors.primary}',
    background: '${theme.colors.background}',
    card: '${theme.colors.card}',
    text: '${theme.colors.text}',
    border: '${theme.colors.border}',
    notification: '${theme.colors.notification}'
  }
};

// Linking configuration
const linking = {
  prefixes: ${JSON.stringify(linking.prefixes)},
  config: {
    screens: ${JSON.stringify(linking.config.screens, null, 4)}
  }
};

export const AppNavigator = () => {
  return (
    <NavigationContainer theme={theme} linking={linking}>
      <Stack.Navigator 
        initialRouteName="AuthStack"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="AuthStack" component={AuthStack} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
        <Stack.Screen name="FormAnalysis" component={FormAnalysisScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="DailyQuests" component={DailyQuestsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Workouts') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else if (route.name === 'Challenges') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '${theme.colors.primary}',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
`;

    return code;
  }

  /**
   * Get screen folder based on type
   */
  private getScreenFolder(type: ScreenType): string {
    const folders: Record<ScreenType, string> = {
      auth: 'auth',
      main: 'main',
      modal: 'modals',
      feature: 'features'
    };
    return folders[type];
  }

  /**
   * Generate screen files
   */
  generateScreenFiles(screens: NavigationScreen[]): Record<string, string> {
    const files: Record<string, string> = {};

    screens.forEach(screen => {
      const folder = this.getScreenFolder(screen.type);
      const filename = `${folder}/${screen.component}.tsx`;
      
      const content = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ${screen.component}Props {
  navigation: any;
  route: any;
}

export const ${screen.component}: React.FC<${screen.component}Props> = ({ navigation, route }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${screen.options.title || screen.name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  }
});
`;

      files[filename] = content;
    });

    return files;
  }

  /**
   * Update screen options
   */
  updateScreenOptions(configName: string, screenName: string, options: Partial<ScreenOptions>): boolean {
    const config = this.configs.get(configName);
    
    if (!config) {
      return false;
    }

    const screen = config.screens.find(s => s.name === screenName);
    
    if (!screen) {
      return false;
    }

    screen.options = {
      ...screen.options,
      ...options
    };

    logger.info('Screen options updated', {
      context: 'rn-navigation',
      metadata: {
        configName,
        screenName,
        options
      }
    });

    return true;
  }

  /**
   * Add screen
   */
  addScreen(configName: string, screen: NavigationScreen): boolean {
    const config = this.configs.get(configName);
    
    if (!config) {
      return false;
    }

    config.screens.push(screen);

    logger.info('Screen added', {
      context: 'rn-navigation',
      metadata: {
        configName,
        screenName: screen.name
      }
    });

    return true;
  }

  /**
   * Remove screen
   */
  removeScreen(configName: string, screenName: string): boolean {
    const config = this.configs.get(configName);
    
    if (!config) {
      return false;
    }

    const index = config.screens.findIndex(s => s.name === screenName);
    
    if (index === -1) {
      return false;
    }

    config.screens.splice(index, 1);

    logger.info('Screen removed', {
      context: 'rn-navigation',
      metadata: {
        configName,
        screenName
      }
    });

    return true;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const configCount = this.configs.size;
    const isHealthy = configCount > 0;

    logger.debug('RN Navigation health check', {
      context: 'rn-navigation',
      metadata: {
        healthy: isHealthy,
        configCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const rnNavigationService = new RNNavigationService();

export default rnNavigationService;
