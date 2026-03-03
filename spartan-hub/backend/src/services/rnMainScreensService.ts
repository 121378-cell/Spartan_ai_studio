/**
 * React Native Main Screens Service
 * Phase C: Mobile App Implementation - Week 11 Day 1
 * 
 * Main screens generation (Home, Workouts, Challenges, Profile)
 */

import { logger } from '../utils/logger';

export interface MainScreenConfig {
  enableHome: boolean;
  enableWorkouts: boolean;
  enableChallenges: boolean;
  enableProfile: boolean;
  showQuickActions: boolean;
  showRecentWorkouts: boolean;
  showActiveChallenges: boolean;
  showStats: boolean;
  [key: string]: any;
}

export interface MainScreenFile {
  filename: string;
  content: string;
  type: 'screen' | 'component' | 'hook';
}

/**
 * React Native Main Screens Service
 */
export class RNMainScreensService {
  private config: MainScreenConfig;

  constructor(config?: Partial<MainScreenConfig>) {
    this.config = {
      enableHome: true,
      enableWorkouts: true,
      enableChallenges: true,
      enableProfile: true,
      showQuickActions: true,
      showRecentWorkouts: true,
      showActiveChallenges: true,
      showStats: true,
      ...config
    };

    logger.info('RNMainScreensService initialized', {
      context: 'rn-main-screens',
      metadata: this.config
    });
  }

  /**
   * Generate all main screens
   */
  generateAllScreens(): MainScreenFile[] {
    const files: MainScreenFile[] = [];

    // Home Screen
    if (this.config.enableHome) {
      files.push({
        filename: 'screens/main/HomeScreen.tsx',
        content: this.generateHomeScreen(),
        type: 'screen'
      });
    }

    // Workouts Screen
    if (this.config.enableWorkouts) {
      files.push({
        filename: 'screens/main/WorkoutsScreen.tsx',
        content: this.generateWorkoutsScreen(),
        type: 'screen'
      });
    }

    // Challenges Screen
    if (this.config.enableChallenges) {
      files.push({
        filename: 'screens/main/ChallengesScreen.tsx',
        content: this.generateChallengesScreen(),
        type: 'screen'
      });
    }

    // Profile Screen
    if (this.config.enableProfile) {
      files.push({
        filename: 'screens/main/ProfileScreen.tsx',
        content: this.generateProfileScreen(),
        type: 'screen'
      });
    }

    logger.info('Main screens generated', {
      context: 'rn-main-screens',
      metadata: {
        totalFiles: files.length
      }
    });

    return files;
  }

  /**
   * Generate Home Screen
   */
  private generateHomeScreen(): string {
    return `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

interface HomeScreenProps {
  navigation: any;
}

interface UserStats {
  level: number;
  xp: number;
  points: number;
  workoutsCompleted: number;
  currentStreak: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load user stats from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats({
        level: 5,
        xp: 1500,
        points: 2500,
        workoutsCompleted: 45,
        currentStreak: 7
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {${this.config.showStats} && stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#EF4444" />
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="barbell" size={32} color="#10B981" />
            <Text style={styles.statValue}>{stats.workoutsCompleted}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#8B5CF6" />
            <Text style={styles.statValue}>{stats.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      {${this.config.showQuickActions} && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('WorkoutDetail')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#4F46E5' }]}>
                <Ionicons name="play" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Start Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('FormAnalysis')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="videocam" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Form Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Challenges')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="trophy" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Challenges</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Achievements')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="medal" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Achievements</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent Workouts */}
      {${this.config.showRecentWorkouts} && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Workouts')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.workoutCard}>
            <View style={styles.workoutIcon}>
              <Ionicons name="barbell" size={24} color="#4F46E5" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Upper Body Strength</Text>
              <Text style={styles.workoutMeta}>45 min • 320 cal</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.workoutCard}>
            <View style={styles.workoutIcon}>
              <Ionicons name="fitness" size={24} color="#10B981" />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>Leg Day</Text>
              <Text style={styles.workoutMeta}>60 min • 450 cal</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </View>
        </View>
      )}

      {/* Active Challenges */}
      {${this.config.showActiveChallenges} && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Challenges</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Challenges')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeTitle}>30-Day Squat Challenge</Text>
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>Active</Text>
              </View>
            </View>
            <Text style={styles.challengeDescription}>Complete 1000 squats in 30 days</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '65%' }]} />
              </View>
              <Text style={styles.progressText}>650/1000</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4
  },
  logoutButton: {
    padding: 8
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginVertical: 16
  },
  statCard: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  section: {
    padding: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  seeAll: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600'
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  quickAction: {
    alignItems: 'center',
    width: '23%'
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  workoutInfo: {
    flex: 1
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  workoutMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  challengeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  challengeBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600'
  },
  challengeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  }
});
`;
  }

  /**
   * Generate Workouts Screen
   */
  private generateWorkoutsScreen(): string {
    return `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WorkoutsScreenProps {
  navigation: any;
}

interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  date: string;
  exercises: number;
}

export const WorkoutsScreen: React.FC<WorkoutsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      // Load workouts from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setWorkouts([
        { id: '1', type: 'Upper Body Strength', duration: 45, calories: 320, date: 'Today', exercises: 8 },
        { id: '2', type: 'Leg Day', duration: 60, calories: 450, date: 'Yesterday', exercises: 10 },
        { id: '3', type: 'Full Body HIIT', duration: 30, calories: 280, date: '2 days ago', exercises: 6 },
      ]);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  const renderWorkoutItem = ({ item }: { item: Workout }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => navigation.navigate('WorkoutDetail', { id: item.id })}
    >
      <View style={styles.workoutIcon}>
        <Ionicons name="barbell" size={24} color="#4F46E5" />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutTitle}>{item.type}</Text>
        <Text style={styles.workoutMeta}>
          {item.duration} min • {item.calories} cal • {item.exercises} exercises
        </Text>
        <Text style={styles.workoutDate}>{item.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('FormAnalysis')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    padding: 16
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  workoutInfo: {
    flex: 1
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  workoutMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  workoutDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  }
});
`;
  }

  /**
   * Generate Challenges Screen
   */
  private generateChallengesScreen(): string {
    return `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChallengesScreenProps {
  navigation: any;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  participants: number;
  endDate: string;
  progress: number;
  target: number;
  status: 'active' | 'completed' | 'upcoming';
  reward: string;
}

export const ChallengesScreen: React.FC<ChallengesScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: '1',
      name: '30-Day Squat Challenge',
      description: 'Complete 1000 squats in 30 days',
      participants: 1250,
      endDate: '2026-06-01',
      progress: 650,
      target: 1000,
      status: 'active',
      reward: '500 points'
    },
    {
      id: '2',
      name: '7-Day Streak Master',
      description: 'Work out 7 days in a row',
      participants: 890,
      endDate: '2026-05-20',
      progress: 5,
      target: 7,
      status: 'active',
      reward: '200 points + Badge'
    },
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const renderChallengeItem = ({ item }: { item: Challenge }) => (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={() => navigation.navigate('WorkoutDetail', { id: item.id })}
    >
      <View style={styles.challengeHeader}>
        <View>
          <Text style={styles.challengeTitle}>{item.name}</Text>
          <Text style={styles.challengeDescription}>{item.description}</Text>
        </View>
        <View style={[styles.statusBadge, styles[\`status\${item.status}\`]]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.challengeMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="people" size={16} color="#6B7280" />
          <Text style={styles.metaText}>{item.participants}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text style={styles.metaText}>{item.endDate}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="gift" size={16} color="#6B7280" />
          <Text style={styles.metaText}>{item.reward}</Text>
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: \`\${(item.progress / item.target) * 100}%\` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {item.progress}/{item.target}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={challenges}
        renderItem={renderChallengeItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  listContent: {
    padding: 16
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827'
  },
  challengeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusActive: {
    backgroundColor: '#D1FAE5'
  },
  statusCompleted: {
    backgroundColor: '#DBEAFE'
  },
  statusUpcoming: {
    backgroundColor: '#FEF3C7'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669'
  },
  challengeMeta: {
    flexDirection: 'row',
    marginBottom: 12
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 12
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  }
});
`;
  }

  /**
   * Generate Profile Screen
   */
  private generateProfileScreen(): string {
    return `import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { icon: 'person', label: 'Edit Profile', screen: 'Settings' },
    { icon: 'settings', label: 'Settings', screen: 'Settings' },
    { icon: 'notifications', label: 'Notifications', screen: 'Notifications' },
    { icon: 'shield-checkmark', label: 'Privacy', screen: 'Privacy' },
    { icon: 'help-circle', label: 'Help & Support', screen: 'Help' },
    { icon: 'information-circle', label: 'About', screen: 'About' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1,500</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>2,500</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Ionicons name={item.icon as any} size={24} color="#6B7280" />
            <Text style={styles.menuItemLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={24} color="#EF4444" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8
  },
  editButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginVertical: 16,
    padding: 16
  },
  statCard: {
    flex: 1,
    alignItems: 'center'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827'
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 24
  }
});
`;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const isHealthy = true;

    logger.debug('RN Main Screens health check', {
      context: 'rn-main-screens',
      metadata: {
        healthy: isHealthy,
        config: this.config
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const rnMainScreensService = new RNMainScreensService();

export default rnMainScreensService;
