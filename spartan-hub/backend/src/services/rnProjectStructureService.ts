/**
 * React Native Project Structure Service
 * Phase C: Mobile Foundation - Week 10 Day 1
 * 
 * Mobile project scaffolding and structure management
 */

import { logger } from '../utils/logger';

export type ProjectTemplate = 'blank' | 'tabs' | 'drawer' | 'custom';
export type NavigationType = 'stack' | 'tabs' | 'drawer' | 'material-top-tabs';

export interface ProjectStructure {
  name: string;
  template: ProjectTemplate;
  navigation: NavigationConfig;
  folders: FolderStructure;
  dependencies: DependencyConfig;
}

export interface NavigationConfig {
  type: NavigationType;
  screens: ScreenConfig[];
  deepLinking: boolean;
  linking: LinkingConfig;
}

export interface ScreenConfig {
  name: string;
  path: string;
  component: string;
  authenticated: boolean;
}

export interface LinkingConfig {
  prefixes: string[];
  config: {
    screens: Record<string, string>;
  };
}

export interface FolderStructure {
  src: {
    components: boolean;
    screens: boolean;
    navigation: boolean;
    services: boolean;
    store: boolean;
    hooks: boolean;
    utils: boolean;
    types: boolean;
    assets: boolean;
    constants: boolean;
  };
}

export interface DependencyConfig {
  reactNative: string;
  navigation: string;
  stateManagement: string;
  ui: string[];
  devDependencies: string[];
}

/**
 * React Native Project Structure Service
 */
export class RNProjectStructureService {
  private projects: Map<string, ProjectStructure> = new Map();

  constructor() {
    logger.info('RNProjectStructureService initialized', {
      context: 'rn-project-structure'
    });
  }

  /**
   * Create React Native project structure
   */
  createProjectStructure(
    name: string,
    template: ProjectTemplate = 'custom'
  ): ProjectStructure {
    const structure: ProjectStructure = {
      name,
      template,
      navigation: this.createNavigationConfig(template),
      folders: this.createFolderStructure(),
      dependencies: this.createDependencyConfig()
    };

    this.projects.set(name, structure);

    logger.info('React Native project structure created', {
      context: 'rn-project-structure',
      metadata: {
        name,
        template
      }
    });

    return structure;
  }

  /**
   * Create navigation configuration
   */
  private createNavigationConfig(template: ProjectTemplate): NavigationConfig {
    const screens: ScreenConfig[] = [
      // Auth screens
      { name: 'Login', path: 'login', component: 'LoginScreen', authenticated: false },
      { name: 'Register', path: 'register', component: 'RegisterScreen', authenticated: false },
      { name: 'ForgotPassword', path: 'forgot-password', component: 'ForgotPasswordScreen', authenticated: false },
      
      // Main screens
      { name: 'Home', path: 'home', component: 'HomeScreen', authenticated: true },
      { name: 'Workouts', path: 'workouts', component: 'WorkoutsScreen', authenticated: true },
      { name: 'WorkoutDetail', path: 'workouts/:id', component: 'WorkoutDetailScreen', authenticated: true },
      { name: 'FormAnalysis', path: 'analysis', component: 'FormAnalysisScreen', authenticated: true },
      { name: 'Challenges', path: 'challenges', component: 'ChallengesScreen', authenticated: true },
      { name: 'Profile', path: 'profile', component: 'ProfileScreen', authenticated: true },
      { name: 'Settings', path: 'settings', component: 'SettingsScreen', authenticated: true },
      
      // Gamification screens
      { name: 'Achievements', path: 'achievements', component: 'AchievementsScreen', authenticated: true },
      { name: 'Leaderboard', path: 'leaderboard', component: 'LeaderboardScreen', authenticated: true },
      { name: 'DailyQuests', path: 'quests', component: 'DailyQuestsScreen', authenticated: true }
    ];

    return {
      type: template === 'tabs' ? 'tabs' : 'stack',
      screens,
      deepLinking: true,
      linking: {
        prefixes: ['spartanhub://', 'https://spartanhub.io'],
        config: {
          screens: screens.reduce((acc, screen) => {
            acc[screen.name] = screen.path;
            return acc;
          }, {} as Record<string, string>)
        }
      }
    };
  }

  /**
   * Create folder structure
   */
  private createFolderStructure(): FolderStructure {
    return {
      src: {
        components: true,
        screens: true,
        navigation: true,
        services: true,
        store: true,
        hooks: true,
        utils: true,
        types: true,
        assets: true,
        constants: true
      }
    };
  }

  /**
   * Create dependency configuration
   */
  private createDependencyConfig(): DependencyConfig {
    return {
      reactNative: '0.73.0',
      navigation: '6.x',
      stateManagement: 'redux-toolkit',
      ui: [
        'react-native-paper',
        'react-native-vector-icons',
        'react-native-gesture-handler',
        'react-native-reanimated',
        'react-native-safe-area-context'
      ],
      devDependencies: [
        '@types/react',
        '@types/react-native',
        '@types/react-native-vector-icons',
        'typescript',
        'jest',
        '@testing-library/react-native',
        'detox',
        'eslint',
        'prettier'
      ]
    };
  }

  /**
   * Get project structure
   */
  getProjectStructure(name: string): ProjectStructure | null {
    return this.projects.get(name) || null;
  }

  /**
   * Get all project structures
   */
  getAllProjectStructures(): Map<string, ProjectStructure> {
    return new Map(this.projects);
  }

  /**
   * Generate project tree
   */
  generateProjectTree(name: string): string {
    const structure = this.getProjectStructure(name);
    
    if (!structure) {
      return '';
    }

    const { folders } = structure;
    
    let tree = `${name}/\n`;
    tree += `├── App.tsx\n`;
    tree += `├── app.json\n`;
    tree += `├── package.json\n`;
    tree += `├── tsconfig.json\n`;
    tree += `├── babel.config.js\n`;
    tree += `├── metro.config.js\n`;
    tree += `├── .eslintrc.js\n`;
    tree += `├── .prettierrc\n`;
    tree += `├── ios/\n`;
    tree += `├── android/\n`;
    tree += `└── src/\n`;

    if (folders.src.components) tree += `    ├── components/\n`;
    if (folders.src.screens) tree += `    ├── screens/\n`;
    if (folders.src.navigation) tree += `    ├── navigation/\n`;
    if (folders.src.services) tree += `    ├── services/\n`;
    if (folders.src.store) tree += `    ├── store/\n`;
    if (folders.src.hooks) tree += `    ├── hooks/\n`;
    if (folders.src.utils) tree += `    ├── utils/\n`;
    if (folders.src.types) tree += `    ├── types/\n`;
    if (folders.src.assets) tree += `    ├── assets/\n`;
    if (folders.src.constants) tree += `    ├── constants/\n`;

    return tree;
  }

  /**
   * Generate package.json
   */
  generatePackageJson(name: string): Record<string, any> {
    const structure = this.getProjectStructure(name);
    
    if (!structure) {
      return {};
    }

    const { dependencies } = structure;

    return {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      private: true,
      scripts: {
        android: 'react-native run-android',
        ios: 'react-native run-ios',
        start: 'react-native start',
        test: 'jest',
        lint: 'eslint . --ext .js,.jsx,.ts,.tsx',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        'build:android': 'cd android && ./gradlew assembleRelease',
        'build:ios': 'cd ios && xcodebuild -workspace SpartanHub.xcworkspace -scheme SpartanHub -configuration Release archive',
        'pod:install': 'cd ios && pod install'
      },
      dependencies: {
        'react': '18.2.0',
        'react-native': dependencies.reactNative,
        '@react-navigation/native': dependencies.navigation,
        '@react-navigation/stack': dependencies.navigation,
        '@react-navigation/bottom-tabs': dependencies.navigation,
        '@react-navigation/drawer': dependencies.navigation,
        'react-native-screens': '~3.27.0',
        'react-native-safe-area-context': '4.7.4',
        'react-native-gesture-handler': '~2.13.4',
        'react-native-reanimated': '~3.5.0',
        'react-native-paper': '^5.11.3',
        'react-native-vector-icons': '^10.0.0',
        '@reduxjs/toolkit': '^1.9.7',
        'react-redux': '^8.1.3',
        'redux-persist': '^6.0.0',
        'axios': '^1.6.0',
        '@react-native-async-storage/async-storage': '1.19.5'
      },
      devDependencies: {
        ...dependencies.devDependencies.reduce((acc, dep) => {
          acc[dep] = 'latest';
          return acc;
        }, {} as Record<string, string>),
        '@babel/core': '^7.23.3',
        '@babel/runtime': '^7.23.4',
        'metro-react-native-babel-preset': '0.77.0',
        'react-test-renderer': '18.2.0'
      }
    };
  }

  /**
   * Generate tsconfig.json
   */
  generateTsConfig(name: string): Record<string, any> {
    return {
      compilerOptions: {
        allowJs: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        isolatedModules: true,
        jsx: 'react-native',
        lib: ['es2020'],
        moduleResolution: 'node',
        noEmit: true,
        strict: true,
        target: 'esnext',
        skipLibCheck: true,
        resolveJsonModule: true,
        baseUrl: './',
        paths: {
          '@/*': ['src/*'],
          '@components/*': ['src/components/*'],
          '@screens/*': ['src/screens/*'],
          '@navigation/*': ['src/navigation/*'],
          '@services/*': ['src/services/*'],
          '@store/*': ['src/store/*'],
          '@hooks/*': ['src/hooks/*'],
          '@utils/*': ['src/utils/*'],
          '@types/*': ['src/types/*'],
          '@assets/*': ['src/assets/*'],
          '@constants/*': ['src/constants/*']
        }
      },
      exclude: [
        'node_modules',
        'babel.config.js',
        'metro.config.js',
        'jest.config.js'
      ]
    };
  }

  /**
   * Generate babel.config.js
   */
  generateBabelConfig(name: string): string {
    return `module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@services': './src/services',
          '@store': './src/store',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@types': './src/types',
          '@assets': './src/assets',
          '@constants': './src/constants',
        },
      },
    ],
  ],
};`;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const projectCount = this.projects.size;
    const isHealthy = projectCount > 0;

    logger.debug('RN Project Structure health check', {
      context: 'rn-project-structure',
      metadata: {
        healthy: isHealthy,
        projectCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const rnProjectStructureService = new RNProjectStructureService();

export default rnProjectStructureService;
