/**
 * AccountabilityDashboard Component
 * 
 * Displays workout partner matches, active challenges, and
 * accountability tracking features.
 */

import React, { useState, useEffect } from 'react';
import { Users, Trophy, Flame, MessageCircle, CheckCircle, X, UserPlus, Calendar } from 'lucide-react';
import './AccountabilityDashboard.css';

interface MatchResult {
  user1Id: string;
  user2Id: string;
  compatibilityScore: number;
  factors: {
    scheduleMatch: number;
    fitnessLevelCompatibility: number;
    goalAlignment: number;
    personalityFit: number;
    activityOverlap: number;
  };
  reason: string;
  suggestedChallenges: string[];
  matchType: 'perfect' | 'great' | 'good' | 'experimental';
}

interface AccountabilityMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  matchScore: number;
  status: 'pending' | 'accepted' | 'declined' | 'active' | 'completed';
  createdAt: string;
  acceptedAt?: string;
  currentStreak: number;
  totalCheckIns: number;
  lastInteraction: string;
  partnerName?: string;
  partnerAvatar?: string;
}

interface Challenge {
  id: string;
  matchId: string;
  type: 'daily_checkin' | 'workout_together' | 'step_competition' | 'custom';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetValue: number;
  unit: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  participants: {
    userId: string;
    currentValue: number;
    completed: boolean;
    completedAt?: string;
  }[];
}

interface AccountabilityDashboardProps {
  userId: string;
}

export const AccountabilityDashboard: React.FC<AccountabilityDashboardProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'active' | 'challenges'>('matches');
  const [potentialMatches, setPotentialMatches] = useState<MatchResult[]>([]);
  const [activeMatches, setActiveMatches] = useState<AccountabilityMatch[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load potential matches
      const matchesResponse = await fetch(`/api/accountability/matches/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setPotentialMatches(matchesData.data || []);
      }

      // Load active matches
      const activeResponse = await fetch(`/api/accountability/matches/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setActiveMatches(activeData.data || []);
      }

      // Load challenges
      const challengesResponse = await fetch(`/api/accountability/challenges/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (challengesResponse.ok) {
        const challengesData = await challengesResponse.json();
        setChallenges(challengesData.data || []);
      }
    } catch (error) {
      console.error('Failed to load accountability data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    try {
      const response = await fetch(`/api/accountability/matches/${matchId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to accept match:', error);
    }
  };

  const handleDeclineMatch = async (matchId: string) => {
    try {
      const response = await fetch(`/api/accountability/matches/${matchId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to decline match:', error);
    }
  };

  const handleCheckIn = async (matchId: string) => {
    try {
      const response = await fetch('/api/accountability/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ matchId, userId })
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to record check-in:', error);
    }
  };

  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case 'perfect': return 'match-perfect';
      case 'great': return 'match-great';
      case 'good': return 'match-good';
      default: return 'match-experimental';
    }
  };

  const renderMatchesTab = () => (
    <div className="matches-tab">
      <h3>🔍 Find Your Perfect Workout Partner</h3>
      <p className="tab-description">
        We've analyzed thousands of users to find your ideal accountability partner based on schedule, goals, and fitness level.
      </p>

      {potentialMatches.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No matches found yet. Check back soon!</p>
        </div>
      ) : (
        <div className="matches-grid">
          {potentialMatches.map((match, index) => (
            <div key={index} className={`match-card ${getMatchTypeColor(match.matchType)}`}>
              <div className="match-header">
                <div className={`match-badge ${match.matchType}`}>
                  {match.matchType === 'perfect' && '✨'}
                  {match.matchType === 'great' && '⭐'}
                  {match.matchType === 'good' && '👍'}
                  {match.matchType} match
                </div>
                <div className="compatibility-score">
                  <span className="score">{match.compatibilityScore}%</span>
                  <span className="label">compatible</span>
                </div>
              </div>

              <div className="match-reason">
                <p>{match.reason}</p>
              </div>

              <div className="match-factors">
                <div className="factor">
                  <span className="factor-name">Schedule</span>
                  <div className="factor-bar">
                    <div
                      className="factor-fill"
                      style={{ width: `${match.factors.scheduleMatch}%` }}
                    />
                  </div>
                  <span className="factor-score">{match.factors.scheduleMatch}%</span>
                </div>
                <div className="factor">
                  <span className="factor-name">Goals</span>
                  <div className="factor-bar">
                    <div
                      className="factor-fill"
                      style={{ width: `${match.factors.goalAlignment}%` }}
                    />
                  </div>
                  <span className="factor-score">{match.factors.goalAlignment}%</span>
                </div>
                <div className="factor">
                  <span className="factor-name">Level</span>
                  <div className="factor-bar">
                    <div
                      className="factor-fill"
                      style={{ width: `${match.factors.fitnessLevelCompatibility}%` }}
                    />
                  </div>
                  <span className="factor-score">{match.factors.fitnessLevelCompatibility}%</span>
                </div>
              </div>

              <div className="suggested-challenges">
                <h5>💪 Suggested Challenges</h5>
                <ul>
                  {match.suggestedChallenges.map((challenge, idx) => (
                    <li key={idx}>{challenge}</li>
                  ))}
                </ul>
              </div>

              <div className="match-actions">
                <button
                  onClick={() => handleAcceptMatch(match.user2Id)}
                  className="btn btn-primary"
                >
                  <UserPlus size={18} /> Connect
                </button>
                <button
                  onClick={() => handleDeclineMatch(match.user2Id)}
                  className="btn btn-secondary"
                >
                  Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderActiveTab = () => (
    <div className="active-tab">
      <h3>🤝 Your Accountability Partners</h3>

      {activeMatches.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No active partners yet. Find your match!</p>
          <button
            onClick={() => setActiveTab('matches')}
            className="btn btn-primary"
          >
            Find Partners
          </button>
        </div>
      ) : (
        <div className="active-matches-list">
          {activeMatches.map((match) => (
            <div key={match.id} className="active-match-card">
              <div className="partner-info">
                <div className="partner-avatar">
                  {match.partnerAvatar ? (
                    <img src={match.partnerAvatar} alt={match.partnerName} />
                  ) : (
                    <Users size={32} />
                  )}
                </div>
                <div className="partner-details">
                  <h4>{match.partnerName || 'Partner'}</h4>
                  <span className="match-score">{match.matchScore}% match</span>
                </div>
              </div>

              <div className="match-stats">
                <div className="stat">
                  <Flame size={20} className="stat-icon" />
                  <span className="stat-value">{match.currentStreak}</span>
                  <span className="stat-label">day streak</span>
                </div>
                <div className="stat">
                  <CheckCircle size={20} className="stat-icon" />
                  <span className="stat-value">{match.totalCheckIns}</span>
                  <span className="stat-label">check-ins</span>
                </div>
              </div>

              <div className="match-actions">
                <button
                  onClick={() => handleCheckIn(match.id)}
                  className="btn btn-primary checkin-btn"
                >
                  <CheckCircle size={18} /> Check In
                </button>
                <button className="btn btn-secondary">
                  <MessageCircle size={18} /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderChallengesTab = () => (
    <div className="challenges-tab">
      <h3>🏆 Active Challenges</h3>

      {challenges.length === 0 ? (
        <div className="empty-state">
          <Trophy size={48} />
          <p>No active challenges. Start one with your partner!</p>
        </div>
      ) : (
        <div className="challenges-list">
          {challenges.map((challenge) => (
            <div key={challenge.id} className={`challenge-card ${challenge.status}`}>
              <div className="challenge-header">
                <h4>{challenge.title}</h4>
                <span className={`status-badge ${challenge.status}`}>
                  {challenge.status}
                </span>
              </div>

              <p className="challenge-description">{challenge.description}</p>

              <div className="challenge-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(challenge.participants[0]?.currentValue || 0) / challenge.targetValue * 100}%`
                    }}
                  />
                </div>
                <span className="progress-text">
                  {challenge.participants[0]?.currentValue || 0} / {challenge.targetValue} {challenge.unit}
                </span>
              </div>

              <div className="challenge-meta">
                <span className="challenge-dates">
                  <Calendar size={14} />
                  {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                </span>
              </div>

              {challenge.status === 'active' && (
                <button className="btn btn-primary update-btn">
                  Update Progress
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="accountability-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading your accountability network...</p>
      </div>
    );
  }

  return (
    <div className="accountability-dashboard">
      <div className="dashboard-header">
        <h2>👥 Accountability Hub</h2>
        <p>Connect with workout partners and achieve goals together</p>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <Users size={18} />
          Find Partners
        </button>
        <button
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <Users size={18} />
          My Partners
          {activeMatches.length > 0 && (
            <span className="badge">{activeMatches.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenges')}
        >
          <Trophy size={18} />
          Challenges
          {challenges.length > 0 && (
            <span className="badge">{challenges.length}</span>
          )}
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'matches' && renderMatchesTab()}
        {activeTab === 'active' && renderActiveTab()}
        {activeTab === 'challenges' && renderChallengesTab()}
      </div>
    </div>
  );
};

export default AccountabilityDashboard;
