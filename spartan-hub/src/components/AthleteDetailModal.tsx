import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Video, Dumbbell } from 'lucide-react';
import BackendApiService from '../services/api';

interface AthleteDetailModalProps {
  athlete: any;
  onClose: () => void;
}

export const AthleteDetailModal: React.FC<AthleteDetailModalProps> = ({ athlete, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [bioState, setBioState] = useState<any>(null);
  const [userPlans, setUserPlans] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'videoAnalysis' && athlete?.id) {
      setIsLoadingHistory(true);
      BackendApiService.getUserFormTrends(athlete.id)
        .then(data => setVideoHistory(data || []))
        .catch(err => console.error(err))
        .finally(() => setIsLoadingHistory(false));
    }
    
    if (activeTab === 'overview' && athlete?.id) {
        BackendApiService.getBioState(athlete.id)
            .then(data => setBioState(data))
            .catch(err => console.error("Error fetching bio state:", err));
    }

    if (activeTab === 'workouts' && athlete?.id) {
        BackendApiService.getUserPlans(athlete.id)
            .then(data => setUserPlans(data || []))
            .catch(err => console.error("Error fetching plans:", err));
    }
  }, [athlete?.id, activeTab]);

  if (!athlete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-spartan-card w-full max-w-4xl rounded-2xl overflow-hidden border border-spartan-border shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-spartan-surface p-6 border-b border-spartan-border flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white">{athlete.name}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-spartan-text-secondary text-sm">{athlete.email}</span>
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                   athlete.riskLevel === 'critical' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                   athlete.riskLevel === 'high' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' :
                   'text-green-500 border-green-500/30 bg-green-500/10'
               }`}>
                   {t(`coachDashboard.riskLevels.${athlete.riskLevel}`, { defaultValue: athlete.riskLevel })}
               </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-spartan-border bg-spartan-surface/50 shrink-0">
          {[
            { id: 'overview', label: t('coachDashboard.details.tabs.overview'), icon: Activity },
            { id: 'videoAnalysis', label: t('coachDashboard.details.tabs.videoAnalysis'), icon: Video },
            { id: 'workouts', label: t('coachDashboard.details.tabs.workouts'), icon: Dumbbell },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'text-spartan-gold border-spartan-gold bg-spartan-gold/5' 
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto grow bg-spartan-bg">
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Vitalis Summary */}
                 <div className="bg-spartan-surface p-6 rounded-xl border border-spartan-border">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="text-blue-400" />
                        Estado Vitalis
                    </h3>
                    {bioState ? (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400 text-sm">Disposición (Readiness)</span>
                                <span className={`font-mono font-bold ${
                                    bioState.readinessScore > 80 ? 'text-green-500' : 
                                    bioState.readinessScore > 50 ? 'text-yellow-500' : 'text-red-500'
                                }`}>{bioState.readinessScore}/100</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400 text-sm">Carga Sistema Nervioso</span>
                                <span className="text-white font-mono font-bold">{bioState.nervousSystemLoad}%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400 text-sm">Calidad de Sueño</span>
                                <span className="text-white font-mono font-bold">{bioState.sleepScore}%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400 text-sm">Nivel de Estrés</span>
                                <span className="text-white font-mono font-bold">{bioState.stressLevel}/10</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">Actualizado: {new Date(bioState.lastUpdate).toLocaleDateString()}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400 text-sm">Carga Sistema Nervioso</span>
                                <span className="text-white font-mono font-bold">--</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400 text-sm">Calidad de Sueño</span>
                                <span className="text-white font-mono font-bold">--</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-4 italic">Datos biométricos no disponibles o cargando...</p>
                        </div>
                    )}
                 </div>

                 {/* AI Recommendation */}
                 <div className="bg-spartan-surface p-6 rounded-xl border border-spartan-border">
                    <h3 className="text-lg font-bold text-white mb-4">Recomendación IA</h3>
                    <p className="text-gray-300 italic text-sm leading-relaxed">"{athlete.recommendation}"</p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'videoAnalysis' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">{t('coachDashboard.details.videoHistory')}</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-widest">{videoHistory.length} SESIONES</span>
              </div>
              
              {isLoadingHistory ? (
                  <div className="flex justify-center py-10">
                      <div className="w-8 h-8 border-4 border-spartan-gold border-t-transparent rounded-full animate-spin" />
                  </div>
              ) : videoHistory.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {videoHistory.map((session, idx) => (
                    <div key={idx} className="bg-spartan-surface p-4 rounded-xl border border-spartan-border hover:border-spartan-gold/30 transition-colors flex justify-between items-center group cursor-pointer">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${
                              session.formScore >= 80 ? 'bg-green-500/10 text-green-500' : 
                              session.formScore >= 60 ? 'bg-yellow-500/10 text-yellow-500' : 
                              'bg-red-500/10 text-red-500'
                          }`}>
                              <Video className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-lg capitalize tracking-tight">
                                {t(`videoAnalysis.exerciseTypes.${session.exerciseType}`, { defaultValue: session.exerciseType })}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                                {new Date(session.createdAt || session.timestamp).toLocaleDateString()} • {new Date(session.createdAt || session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                      </div>
                      <div className="text-right flex items-center gap-6">
                        <div>
                            <div className={`text-2xl font-black ${
                                session.formScore >= 80 ? 'text-green-500' : 
                                session.formScore >= 60 ? 'text-yellow-500' : 
                                'text-red-500'
                            }`}>
                              {session.formScore}
                            </div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('coachDashboard.details.score')}</p>
                        </div>
                        {/* Future: Add 'View Details' button here to open DeadliftReportView */}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-spartan-border rounded-2xl">
                    <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">{t('coachDashboard.details.noVideos')}</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'workouts' && (
             <div className="space-y-4 animate-fadeIn">
                 <h3 className="text-lg font-bold text-white mb-4">{t('coachDashboard.details.plans')}</h3>
                 {userPlans.length > 0 ? (
                     <div className="grid grid-cols-1 gap-4">
                         {userPlans.map((plan, idx) => (
                             <div key={idx} className="bg-spartan-surface p-4 rounded-xl border border-spartan-border flex justify-between items-center hover:border-blue-500/30 transition-colors group cursor-pointer">
                                 <div className="flex items-center gap-4">
                                     <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                         <Dumbbell className="w-6 h-6" />
                                     </div>
                                     <div>
                                         <p className="font-bold text-white text-lg">{t('coachDashboard.details.plan')} #{plan.routineId.substring(0,8)}</p>
                                         <p className="text-xs text-gray-500">{t('coachDashboard.details.assigned')}: {new Date(plan.assignedAt).toLocaleDateString()}</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <p className="text-sm text-gray-400">{t('coachDashboard.details.start')}: {new Date(plan.startDate).toLocaleDateString()}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="text-center py-16 border-2 border-dashed border-spartan-border rounded-2xl">
                         <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                         <p className="text-gray-500">{t('coachDashboard.details.noPlans')}</p>
                     </div>
                 )}
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
