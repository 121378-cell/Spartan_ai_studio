import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Plus, 
  Clock, 
  Trophy,
  Calendar,
  Users,
  Zap,
  CheckCircle,
  Circle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiClient from '../../services/httpService';
import type { Challenge } from '../../types/engagement';

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin: (challengeId: number) => void;
  onUpdateProgress: (challengeId: number, progress: number) => void;
  isJoined: boolean;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ 
  challenge, 
  onJoin, 
  onUpdateProgress,
  isJoined 
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Clock className="w-4 h-4" />;
      case 'weekly': return <Calendar className="w-4 h-4" />;
      case 'monthly': return <Users className="w-4 h-4" />;
      case 'special': return <Zap className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{challenge.title}</h3>
            <p className="text-gray-600 text-sm mb-3">{challenge.description}</p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${getDifficultyColor(challenge.difficulty)}`}>
              {challenge.difficulty}
            </span>
            <div className="flex items-center text-sm text-gray-500">
              {getTypeIcon(challenge.type)}
              <span className="ml-1 capitalize">{challenge.type}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="font-semibold text-gray-900">{challenge.rewardPoints} points</span>
          </div>
          <div className="text-sm text-gray-500">
            Ends {new Date(challenge.endDate).toLocaleDateString()}
          </div>
        </div>

        {isJoined ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Your Progress</span>
                <span className="font-medium">{Math.round(challenge.progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${challenge.progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            
            {challenge.progressPercentage < 100 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onUpdateProgress(challenge.id, Math.min(100, challenge.progressPercentage + 10))}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Update Progress +10%
                </button>
                <button
                  onClick={() => onUpdateProgress(challenge.id, 100)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Complete
                </button>
              </div>
            )}
            
            {challenge.progressPercentage >= 100 && (
              <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700 font-medium">Challenge Completed!</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onJoin(challenge.id)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Join Challenge
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const ChallengeHub: React.FC = () => {
  const { userProfile: user } = useAppContext();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'joined'>('available');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [availableRes, joinedRes] = await Promise.all([
        apiClient.get(`/phase9/engagement/challenges/user/${user!.id}/available`),
        apiClient.get(`/phase9/engagement/challenges/user/${user!.id}/active`)
      ]);

      setChallenges(availableRes.data.data);
      setUserChallenges(joinedRes.data.data);
    } catch (err) {
      setError('Failed to load challenges');
      console.error('Error fetching challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: number) => {
    try {
      await apiClient.post(`/phase9/engagement/challenges/${user!.id}/${challengeId}/join`);
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error joining challenge:', err);
      alert('Failed to join challenge');
    }
  };

  const handleUpdateProgress = async (challengeId: number, progress: number) => {
    try {
      await apiClient.put(`/phase9/engagement/challenges/${user!.id}/${challengeId}/progress`, {
        progress
      });
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error updating progress:', err);
      alert('Failed to update progress');
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Challenge Hub</h1>
        <p className="text-gray-600">Join challenges, track progress, and earn rewards</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'available'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Available Challenges
        </button>
        <button
          onClick={() => setActiveTab('joined')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'joined'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Challenges ({userChallenges.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'available' ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {challenges.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges available</h3>
              <p className="text-gray-500">Check back later for new challenges!</p>
            </div>
          ) : (
            challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onJoin={handleJoinChallenge}
                onUpdateProgress={handleUpdateProgress}
                isJoined={challenge.isJoined}
              />
            ))
          )}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {userChallenges.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No active challenges</h3>
              <p className="text-gray-500">Join some challenges to get started!</p>
              <button
                onClick={() => setActiveTab('available')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Browse Challenges
              </button>
            </div>
          ) : (
            userChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onJoin={handleJoinChallenge}
                onUpdateProgress={handleUpdateProgress}
                isJoined={true}
              />
            ))
          )}
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {challenges.filter(c => !c.isJoined).length}
              </p>
              <p className="text-gray-600">Available</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {userChallenges.filter(c => c.progressPercentage >= 100).length}
              </p>
              <p className="text-gray-600">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {userChallenges.reduce((sum, c) => sum + c.rewardPoints * (c.progressPercentage / 100), 0).toFixed(0)}
              </p>
              <p className="text-gray-600">Potential Points</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};