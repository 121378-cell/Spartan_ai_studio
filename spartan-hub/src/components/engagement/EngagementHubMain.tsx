import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Users, 
  BarChart3,
  Home,
  TrendingUp
} from 'lucide-react';
import { EngagementDashboard } from './EngagementDashboard';
import { ChallengeHub } from './ChallengeHub';
import { CommunityHub } from './CommunityHub';

export const EngagementHubMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'challenges' | 'community' | 'analytics'>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'challenges', label: 'Challenges', icon: Target },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EngagementDashboard />;
      case 'challenges':
        return <ChallengeHub />;
      case 'community':
        return <CommunityHub />;
      case 'analytics':
        return (
          <div className="max-w-6xl mx-auto p-6">
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
              <p className="text-gray-600">Detailed analytics and insights coming soon</p>
            </div>
          </div>
        );
      default:
        return <EngagementDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="transition-all duration-300"
      >
        {renderContent()}
      </motion.div>

      {/* Floating Action Button */}
      {activeTab !== 'dashboard' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('dashboard')}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl z-20"
        >
          <Home className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
};