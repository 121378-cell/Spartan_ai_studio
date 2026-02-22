import React, { useEffect, lazy, Suspense } from 'react';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import { DeviceProvider } from './context/DeviceContext.tsx';
import { WearableProvider } from './context/WearableContext.tsx';
import { useDevice } from './context/DeviceContext.tsx';
import GovernancePanel from './components/GovernancePanel.tsx';
import { useGlobalKeyboardShortcut } from './hooks/useGlobalKeyboardShortcut';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import WorkoutSession from './components/WorkoutSession.tsx';
import Modal from './components/Modal.tsx';
import Toast from './components/Toast.tsx';
import AiChat from './components/AiChat.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

// Lazy loaded pages
const Routines = lazy(() => import('./components/Routines.tsx'));
const Calendar = lazy(() => import('./components/Calendar.tsx'));
const Reconditioning = lazy(() => import('./components/Reconditioning.tsx'));
const Discipline = lazy(() => import('./components/Discipline.tsx'));
const Legend = lazy(() => import('./components/Legend.tsx'));
const MasterRegulation = lazy(() => import('./components/MasterRegulation.tsx'));
const Nutrition = lazy(() => import('./components/Nutrition.tsx'));
const SuccessManual = lazy(() => import('./components/SuccessManual.tsx'));
const Flow = lazy(() => import('./components/Flow.tsx'));
const Progress = lazy(() => import('./components/Progress.tsx'));
const SynergyHub = lazy(() => import('./components/SynergyHub.tsx'));
const ExerciseLibrary = lazy(() => import('./components/ExerciseLibrary.tsx'));
const CoachDashboard = lazy(() => import('./components/CoachDashboard.tsx'));
const AiDashboard = lazy(() => import('./components/AiDashboard.tsx'));

// Lazy loaded modals
const SmartRoutineModal = lazy(() => import('./components/modals/SmartRoutineModal.tsx'));
const CreateProfileModal = lazy(() => import('./components/modals/CreateProfileModal.tsx'));
const EditProfileModal = lazy(() => import('./components/modals/EditProfileModal.tsx'));
const WorkoutSummaryModal = lazy(() => import('./components/modals/WorkoutSummaryModal.tsx'));
const VideoFeedbackModal = lazy(() => import('./components/modals/VideoFeedbackModal.tsx'));
const CreateReconditioningPlanModal = lazy(() => import('./components/modals/CreateReconditioningPlanModal.tsx'));
const SkipConfirmationModal = lazy(() => import('./components/modals/SkipConfirmationModal.tsx'));
const LogSetModal = lazy(() => import('./components/modals/LogSetModal.tsx'));
const ExerciseOptionsModal = lazy(() => import('./components/modals/ExerciseOptionsModal.tsx'));
const CortisolShieldModal = lazy(() => import('./components/modals/CortisolShieldModal.tsx'));
const AdaptRoutineModal = lazy(() => import('./components/modals/AdaptRoutineModal.tsx'));
const EvaluationModal = lazy(() => import('./components/modals/EvaluationModal.tsx'));
const CreateHabitModal = lazy(() => import('./components/modals/CreateHabitModal.tsx'));
const MasterRegulationSettingsModal = lazy(() => import('./components/modals/MasterRegulationSettingsModal.tsx'));
const NutritionSettingsModal = lazy(() => import('./components/modals/NutritionSettingsModal.tsx'));
const ChronotypeQuestionnaireModal = lazy(() => import('./components/modals/ChronotypeQuestionnaireModal.tsx'));
const HormesisProtocolModal = lazy(() => import('./components/modals/HormesisProtocolModal.tsx'));
const CognitiveReframingModal = lazy(() => import('./components/modals/CognitiveReframingModal.tsx'));
const MicroVictoryModal = lazy(() => import('./components/modals/MicroVictoryModal.tsx'));
const DailyCheckInModal = lazy(() => import('./components/modals/DailyCheckInModal.tsx'));
const WeeklyCheckInModal = lazy(() => import('./components/modals/WeeklyCheckInModal.tsx'));
const MonthlyCheckInModal = lazy(() => import('./components/modals/MonthlyCheckInModal.tsx'));
const WeeklyCheckInFeedbackModal = lazy(() => import('./components/modals/WeeklyCheckInFeedbackModal.tsx'));
const AutonomyUnlockedModal = lazy(() => import('./components/modals/AutonomyUnlockedModal.tsx'));
const SuccessManualModal = lazy(() => import('./components/modals/SuccessManualModal.tsx'));
const ProtocolInstructionModal = lazy(() => import('./components/modals/ProtocolInstructionModal.tsx'));
const PropheticInterventionModal = lazy(() => import('./components/modals/PropheticInterventionModal.tsx'));
const DiscomfortReportModal = lazy(() => import('./components/modals/DiscomfortReportModal.tsx'));
const PrehabProtocolModal = lazy(() => import('./components/modals/PrehabProtocolModal.tsx'));
const ExerciseDetailModal = lazy(() => import('./components/modals/ExerciseDetailModal.tsx'));
const MobilityAssessmentModal = lazy(() => import('./components/modals/MobilityAssessmentModal.tsx'));
const NewTrainingCycleModal = lazy(() => import('./components/modals/NewTrainingCycleModal.tsx'));
const WeeklyPlannerModal = lazy(() => import('./components/modals/WeeklyPlannerModal.tsx'));
const RescheduleConfirmationModal = lazy(() => import('./components/modals/RescheduleConfirmationModal.tsx'));
const DailySummaryModal = lazy(() => import('./components/modals/DailySummaryModal.tsx'));
const CommandBarModal = lazy(() => import('./components/modals/CommandBarModal.tsx'));
const FormAnalysisModal = lazy(() => import('./components/FormAnalysis/FormAnalysisModal.tsx'));
const LogisticsInterventionModal = lazy(() => import('./components/modals/LogisticsInterventionModal.tsx'));
const TimeAdjustmentModal = lazy(() => import('./components/modals/TimeAdjustmentModal.tsx'));
const TrainingRecommendationsModal = lazy(() => import('./components/TrainingRecommendationsModal.tsx'));

// Static imports for core components
import PreWorkoutFlow from './components/PreWorkoutFlow.tsx';
import FocusSession from './components/FocusSession.tsx';
import FloatingVoiceButton from './components/FloatingVoiceButton.tsx';
import { DevAuthHelper } from './components/dev/DevAuthHelper.tsx';

const AppContent: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    userProfile,
    activeSession,
    isChatOpen,
    modal,
    toast,
    showModal,
    isPreWorkoutActive,
    isFocusSessionActive,
  } = useAppContext();

  const { isDesktop } = useDevice();

  // Global keyboard shortcut for desktop devices
  useGlobalKeyboardShortcut(['Ctrl', 'Shift', 'V'], () => {
    if (isDesktop) {
      showModal('command-bar');
    }
  });

  useEffect(() => {
    if (!userProfile.onboardingCompleted) {
      showModal('evaluation');
    }
  }, [userProfile.onboardingCompleted]);

  const renderPage = () => {
    if (activeSession) {
      return <WorkoutSession />;
    }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'routines': return <Routines />;
      case 'calendar': return <Calendar />;
      case 'exercise-library': return <ExerciseLibrary />;
      case 'reconditioning': return <Reconditioning />;
      case 'discipline': return <Discipline />;
      case 'legend': return <Legend />;
      case 'master-regulation': return <MasterRegulation />;
      case 'nutrition': return <Nutrition />;
      case 'success-manual': return <SuccessManual />;
      case 'flow': return <Flow />;
      case 'progress': return <Progress />;
      case 'synergy-hub': return <SynergyHub />;
      case 'form-analysis': return <FormAnalysisModal onClose={() => setCurrentPage('dashboard')} />;
      case 'coach-dashboard': return <CoachDashboard />;
      case 'ai-dashboard': return <AiDashboard />;
      default: return <Dashboard />;
    }
  };

  const renderModalContent = () => {
    switch (modal.type) {
      case 'smart-routine-creator': return <SmartRoutineModal />;
      case 'create-profile': return <CreateProfileModal />;
      case 'edit-profile': return <EditProfileModal />;
      case 'workout-summary': return <WorkoutSummaryModal summary={modal.payload as any} />;
      case 'video-feedback': return <VideoFeedbackModal />;
      case 'create-reconditioning-plan': return <CreateReconditioningPlanModal />;
      case 'skip-pre-workout-confirmation': return <SkipConfirmationModal />;
      case 'log-set': return <LogSetModal />;
      case 'exercise-options': return <ExerciseOptionsModal exerciseName={modal.payload.exerciseName} />;
      case 'cortisol-shield': return <CortisolShieldModal routine={modal.payload.routine} hoursBeforeBed={modal.payload.hoursBeforeBed} />;
      case 'adapt-routine': return <AdaptRoutineModal routine={modal.payload.routine} />;
      case 'evaluation': return <EvaluationModal />;
      case 'create-habit': return <CreateHabitModal />;
      case 'master-regulation-settings': return <MasterRegulationSettingsModal />;
      case 'nutrition-settings': return <NutritionSettingsModal />;
      case 'chronotype-questionnaire': return <ChronotypeQuestionnaireModal />;
      case 'hormesis-protocol': return <HormesisProtocolModal />;
      case 'cognitive-reframing': return <CognitiveReframingModal reframedMessage={modal.payload.reframedMessage} microAction={modal.payload.microAction} />;
      case 'micro-victory': return <MicroVictoryModal />;
      case 'daily-check-in': return <DailyCheckInModal />;
      case 'weekly-check-in': return <WeeklyCheckInModal />;
      case 'monthly-check-in': return <MonthlyCheckInModal />;
      case 'weekly-check-in-feedback': return <WeeklyCheckInFeedbackModal feedback={modal.payload.feedback} />;
      case 'autonomy-unlocked': return <AutonomyUnlockedModal />;
      case 'success-manual': return <SuccessManualModal manualContent={modal.payload.manualContent} />;
      case 'protocol-instruction': return <ProtocolInstructionModal title={modal.payload.title} instructions={modal.payload.instructions} />;
      case 'prophetic-intervention': return <PropheticInterventionModal />;
      case 'discomfort-report': return <DiscomfortReportModal />;
      case 'prehab-protocol': return <PrehabProtocolModal protocol={modal.payload.protocol} />;
      case 'exercise-detail': return <ExerciseDetailModal />;
      case 'mobility-assessment': return <MobilityAssessmentModal />;
      case 'new-training-cycle': return <NewTrainingCycleModal />;
      case 'weekly-planner': return <WeeklyPlannerModal />;
      case 'reschedule-confirmation': return <RescheduleConfirmationModal warning={modal.payload.warning} onConfirm={modal.payload.onConfirm} />;
      case 'daily-summary': return <DailySummaryModal payload={modal.payload as any} />;
      case 'command-bar': return <CommandBarModal />;
      case 'logistics-intervention': return <LogisticsInterventionModal payload={modal.payload as any} />;
      case 'time-adjustment': return <TimeAdjustmentModal routine={modal.payload.routine} />;
      case 'form-analysis': return <FormAnalysisModal onClose={modal.onClose || (() => { })} initialExercise={modal.payload?.exercise} />;
      case 'training-recommendations': return <TrainingRecommendationsModal 
        trainingHistory={modal.payload.trainingHistory}
        preferences={modal.payload.preferences}
      />;
      default: return null;
    }
  };

  if (!userProfile.onboardingCompleted && modal.type !== 'evaluation') {
    return (
      <div className="flex bg-spartan-bg text-spartan-text min-h-screen">
        <Modal>{renderModalContent()}</Modal>
      </div>
    );
  }

  if (isFocusSessionActive) {
    return <FocusSession />;
  }

  return (
    <div className="flex flex-col lg:flex-row bg-spartan-bg text-spartan-text min-h-screen font-sans">
      {userProfile.onboardingCompleted && <Sidebar />}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto mt-16 lg:mt-0">
        <Suspense fallback={<LoadingSpinner />}>
          {isPreWorkoutActive ? <PreWorkoutFlow /> : renderPage()}
        </Suspense>
      </main>
      {isChatOpen && <AiChat />}
      <Modal>
        <Suspense fallback={<LoadingSpinner />}>
          {renderModalContent()}
        </Suspense>
      </Modal>
      <Toast message={toast.message} isVisible={toast.isVisible} />
      <FloatingVoiceButton />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <DeviceProvider>
        <WearableProvider>
          <DevAuthHelper />
          <AppContent />
        </WearableProvider>
      </DeviceProvider>
    </AppProvider>
  );
};

export default App;
