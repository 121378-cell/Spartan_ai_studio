

import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext.tsx';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import Routines from './components/Routines.tsx';
import Calendar from './components/Calendar.tsx';
import WorkoutSession from './components/WorkoutSession.tsx';
import Modal from './components/Modal.tsx';
import Toast from './components/Toast.tsx';
import AiChat from './components/AiChat.tsx';
import SmartRoutineModal from './components/modals/SmartRoutineModal.tsx';
import CreateProfileModal from './components/modals/CreateProfileModal.tsx';
import EditProfileModal from './components/modals/EditProfileModal.tsx';
import WorkoutSummaryModal from './components/modals/WorkoutSummaryModal.tsx';
import VideoFeedbackModal from './components/modals/VideoFeedbackModal.tsx';
import CreateReconditioningPlanModal from './components/modals/CreateReconditioningPlanModal.tsx';
import PreWorkoutFlow from './components/PreWorkoutFlow.tsx';
import SkipConfirmationModal from './components/modals/SkipConfirmationModal.tsx';
import LogSetModal from './components/modals/LogSetModal.tsx';
import ExerciseOptionsModal from './components/modals/ExerciseOptionsModal.tsx';
import CortisolShieldModal from './components/modals/CortisolShieldModal.tsx';
import AdaptRoutineModal from './components/modals/AdaptRoutineModal.tsx';
import EvaluationModal from './components/modals/EvaluationModal.tsx';
// FIX: Import the Reconditioning component to resolve the 'Cannot find name' error.
import Reconditioning from './components/Reconditioning.tsx';
import Discipline from './components/Discipline.tsx';
import CreateHabitModal from './components/modals/CreateHabitModal.tsx';
import Legend from './components/Legend.tsx';
import MasterRegulation from './components/MasterRegulation.tsx';
import MasterRegulationSettingsModal from './components/modals/MasterRegulationSettingsModal.tsx';
import Nutrition from './components/Nutrition.tsx';
import NutritionSettingsModal from './components/modals/NutritionSettingsModal.tsx';
import ChronotypeQuestionnaireModal from './components/modals/ChronotypeQuestionnaireModal.tsx';
import HormesisProtocolModal from './components/modals/HormesisProtocolModal.tsx';
import CognitiveReframingModal from './components/modals/CognitiveReframingModal.tsx';
import MicroVictoryModal from './components/modals/MicroVictoryModal.tsx';
import DailyCheckInModal from './components/modals/DailyCheckInModal.tsx';
import WeeklyCheckInModal from './components/modals/WeeklyCheckInModal.tsx';
import MonthlyCheckInModal from './components/modals/MonthlyCheckInModal.tsx';
import WeeklyCheckInFeedbackModal from './components/modals/WeeklyCheckInFeedbackModal.tsx';
import AutonomyUnlockedModal from './components/modals/AutonomyUnlockedModal.tsx';
import SuccessManual from './components/SuccessManual.tsx';
import SuccessManualModal from './components/modals/SuccessManualModal.tsx';
import Flow from './components/Flow.tsx';
import FocusSession from './components/FocusSession.tsx';
import ProtocolInstructionModal from './components/modals/ProtocolInstructionModal.tsx';
import PropheticInterventionModal from './components/modals/PropheticInterventionModal.tsx';
import DiscomfortReportModal from './components/modals/DiscomfortReportModal.tsx';
import PrehabProtocolModal from './components/modals/PrehabProtocolModal.tsx';
import ExerciseLibrary from './components/ExerciseLibrary.tsx';
import ExerciseDetailModal from './components/modals/ExerciseDetailModal.tsx';
import MobilityAssessmentModal from './components/modals/MobilityAssessmentModal.tsx';
import NewTrainingCycleModal from './components/modals/NewTrainingCycleModal.tsx';
import WeeklyPlannerModal from './components/modals/WeeklyPlannerModal.tsx';
import RescheduleConfirmationModal from './components/modals/RescheduleConfirmationModal.tsx';
import DailySummaryModal from './components/modals/DailySummaryModal.tsx';
import CommandCenterModal from './components/modals/CommandCenterModal.tsx';
import Progress from './components/Progress.tsx';
import SynergyHub from './components/SynergyHub.tsx';
import LogisticsInterventionModal from './components/modals/LogisticsInterventionModal.tsx';
import TimeAdjustmentModal from './components/modals/TimeAdjustmentModal.tsx';

const AppContent: React.FC = () => {
  const { 
    currentPage, 
    userProfile, 
    activeSession, 
    isChatOpen, 
    modal, 
    toast, 
    showModal, 
    isPreWorkoutActive,
    isFocusSessionActive,
  } = useAppContext();

  useEffect(() => {
    if (!userProfile.onboardingCompleted) {
      showModal('evaluation');
    }
  }, [userProfile.onboardingCompleted, showModal]);

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
      default: return <Dashboard />;
    }
  };

  const renderModalContent = () => {
    switch (modal.type) {
      case 'smart-routine-creator': return <SmartRoutineModal />;
      case 'create-profile': return <CreateProfileModal />;
      case 'edit-profile': return <EditProfileModal />;
      case 'workout-summary': return <WorkoutSummaryModal summary={modal.payload} />;
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
      case 'daily-summary': return <DailySummaryModal payload={modal.payload} />;
      case 'command-center': return <CommandCenterModal />;
      case 'logistics-intervention': return <LogisticsInterventionModal payload={modal.payload} />;
      case 'time-adjustment': return <TimeAdjustmentModal routine={modal.payload.routine} />;
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
    <div className="flex bg-spartan-bg text-spartan-text min-h-screen">
      {userProfile.onboardingCompleted && <Sidebar />}
      <main className="flex-1 p-8 overflow-y-auto">
        {isPreWorkoutActive ? <PreWorkoutFlow /> : renderPage()}
      </main>
      {isChatOpen && <AiChat />}
      <Modal>{renderModalContent()}</Modal>
      <Toast message={toast.message} isVisible={toast.isVisible} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;