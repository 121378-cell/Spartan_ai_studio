import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Users, 
  TrendingUp, 
  Calendar,
  Star,
  Flame,
  Award,
  Crown,
  Zap
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiClient from '../../services/httpService';
import type { Achievement, Challenge, Streak, LeaderboardEntry } from '../../types/engagement';

export const EngagementDashboard: React.FC = () => {
  const { userProfile: user } = useAppContext();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all engagement data in parallel
      const [achievementsRes, challengesRes, streaksRes, leaderboardRes] = await Promise.all([
        apiClient.get(`/phase9/achievements/user/${user!.id}`),
        apiClient.get(`/phase9/engagement/challenges/user/${user!.id}/active`),
        apiClient.get(`/phase9/engagement/streaks/user/${user!.id}`),
        apiClient.get('/phase9/engagement/leaderboard?limit=10')
      ]);

      setAchievements(achievementsRes.data.data);
      setActiveChallenges(challengesRes.data.data);
      setStreaks(streaksRes.data.data);
      setLeaderboard(leaderboardRes.data.data);
    } catch (err) {
      setError('Failed to load engagement data');
      console.error('Error fetching engagement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStreakIcon = (streakType: string) => {
    switch (streakType) {
      case 'workout': return <Zap className="w-5 h-5" />;
      case 'login': return <Calendar className="w-5 h-5" />;
      case 'completion': return <Trophy className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const getAchievementIcon = (achievementId: string) => {
    switch (achievementId) {
      case 'first_workout': return <Target className="w-6 h-6" />;
      case 'streak_7': return <Flame className="w-6 h-6" />;
      case 'challenges_completed': return <Award className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Engagement Hub</h1>
        <p className="text-gray-600">Track your progress, compete with others, and unlock achievements</p>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Achievements</p>
              <p className="text-2xl font-bold text-gray-900">
                {achievements.filter(a => a.status === 'unlocked').length}
              </p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Challenges</p>
              <p className="text-2xl font-bold text-gray-900">{activeChallenges.length}</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Best Streak</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(...streaks.map(s => s.currentStreak), 0)} days
              </p>
            </div>
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rank</p>
              <p className="text-2xl font-bold text-gray-900">
                #{leaderboard.findIndex(u => String(u.id) === user?.id) + 1 || '-'}
              </p>
            </div>
            <Crown className="w-8 h-8 text-purple-500" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Achievements Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Your Achievements
            </h2>
          </div>
          <div className="p-6">
            {achievements.filter(a => a.status === 'unlocked').length === 0 ? (
              <p className="text-gray-500 text-center py-8">No achievements yet. Complete workouts to unlock!</p>
            ) : (
              <div className="space-y-4">
                {achievements
                  .filter(a => a.status === 'unlocked')
                  .slice(0, 5)
                  .map((achievement) => (
                    <div key={achievement.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="mr-3 text-yellow-500">
                        {getAchievementIcon(achievement.achievementId)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                        <p className="text-sm text-gray-500">{achievement.description}</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Active Challenges */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              Active Challenges
            </h2>
          </div>
          <div className="p-6">
            {activeChallenges.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active challenges. Join one to get started!</p>
            ) : (
              <div className="space-y-4">
                {activeChallenges.map((challenge) => (
                  <div key={challenge.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{challenge.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        challenge.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        challenge.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{Math.round(challenge.progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${challenge.progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {challenge.rewardPoints} pts
                        </div>
                        <div className="text-xs text-gray-500">
                          ends {new Date(challenge.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Streaks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Flame className="w-5 h-5 mr-2 text-orange-500" />
              Your Streaks
            </h2>
          </div>
          <div className="p-6">
            {streaks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Start building streaks by completing daily activities!</p>
            ) : (
              <div className="space-y-4">
                {streaks.map((streak) => (
                  <div key={streak.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="mr-3 text-orange-500">
                        {getStreakIcon(streak.streakType)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 capitalize">
                          {streak.streakType} Streak
                        </h3>
                        <p className="text-sm text-gray-600">
                          Longest: {streak.longestStreak} days
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {streak.currentStreak}
                      </div>
                      <div className="text-xs text-gray-500">current</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-500" />
              Top Performers
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((userEntry, index) => (
                <div 
                  key={userEntry.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    String(userEntry.id) === user?.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index < 3 ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{userEntry.username}</h3>
                      <p className="text-sm text-gray-500">
                        {userEntry.challengesCompleted} challenges
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {userEntry.totalPoints}
                    </div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};