import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import { useTranslation } from 'react-i18next';
import type { Page } from '../types.ts';

import HomeIcon from './icons/HomeIcon.tsx';
import DumbbellIcon from './icons/DumbbellIcon.tsx';
import CalendarIcon from './icons/CalendarIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';
import BrainIcon from './icons/BrainIcon.tsx';
import LaurelWreathIcon from './icons/LaurelWreathIcon.tsx';
import FireIcon from './icons/FireIcon.tsx';
import LotusIcon from './icons/LotusIcon.tsx';
import NutritionIcon from './icons/NutritionIcon.tsx';
import RegulationIcon from './icons/RegulationIcon.tsx';
import BookIcon from './icons/BookIcon.tsx';
import FocusIcon from './icons/FocusIcon.tsx';
import ChartBarIcon from './icons/ChartBarIcon.tsx';
import VideoCameraIcon from './icons/VideoCameraIcon.tsx';
import { Users, Cpu } from 'lucide-react';
import BluetoothConnector from './BluetoothConnector.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';

interface NavItemProps {
  page: Page;
  label: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, toggleChat, userProfile } = useAppContext();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false); // Mobile state

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const navItems: NavItemProps[] = [
    { page: 'dashboard', label: t('sidebar.dashboard'), icon: <HomeIcon className="w-6 h-6" /> },
    { page: 'routines', label: t('sidebar.routines'), icon: <DumbbellIcon className="w-6 h-6" /> },
    { page: 'exercise-library', label: t('sidebar.armory'), icon: <UserIcon className="w-6 h-6" /> },
    { page: 'form-analysis', label: t('sidebar.formAnalysis'), icon: <VideoCameraIcon className="w-6 h-6" /> },
    { page: 'progress', label: t('sidebar.progress'), icon: <ChartBarIcon className="w-6 h-6" /> },
    { page: 'calendar', label: t('sidebar.calendar'), icon: <CalendarIcon className="w-6 h-6" /> },
    { page: 'legend', label: t('sidebar.legend'), icon: <LaurelWreathIcon className="w-6 h-6" /> },
    { page: 'discipline', label: t('sidebar.discipline'), icon: <FireIcon className="w-6 h-6" /> },
    { page: 'flow', label: t('sidebar.flow'), icon: <FocusIcon className="w-6 h-6" /> },
    { page: 'reconditioning', label: t('sidebar.reconditioning'), icon: <LotusIcon className="w-6 h-6" /> },
    { page: 'nutrition', label: t('sidebar.nutrition'), icon: <NutritionIcon className="w-6 h-6" /> },
    { page: 'master-regulation', label: t('sidebar.regulation'), icon: <RegulationIcon className="w-6 h-6" /> },
  ];

  if (userProfile.role === 'coach' || userProfile.role === 'admin') {
    navItems.unshift({ 
      page: 'coach-dashboard', 
      label: t('sidebar.coachHub'), 
      icon: <Users className="w-6 h-6" /> 
    });
  }

  if (userProfile.role === 'admin') {
    navItems.push({
      page: 'ai-dashboard',
      label: t('sidebar.aiDashboard'),
      icon: <Cpu className="w-6 h-6" />
    });
  }
  
  const autonomyNavItem: NavItemProps = { 
      page: 'success-manual', 
      label: t('sidebar.manual'), 
      icon: <BookIcon className="w-6 h-6" /> 
  };

  const NavLink: React.FC<NavItemProps> = ({ page, label, icon }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => {
          setCurrentPage(page);
          closeSidebar();
        }}
        className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors ${
          isActive
            ? 'bg-spartan-gold text-spartan-bg'
            : 'text-spartan-text-secondary hover:bg-spartan-surface hover:text-spartan-text'
        }`}
      >
        {icon}
        <span className="ml-4 font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="p-2 bg-spartan-card rounded-lg text-spartan-gold shadow-lg"
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-spartan-card p-4 flex flex-col z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="text-center my-4">
          <h1 className="text-3xl font-bold text-spartan-gold tracking-widest">SPARTAN</h1>
          <p className="text-xs text-spartan-text-secondary uppercase">{t('sidebar.synergyAi')}</p>
        </div>
        
        <nav className="flex-1 mt-8 overflow-y-auto scrollbar-hide">
          {navItems.map(item => (
            <NavLink 
              key={item.page} 
              page={item.page} 
              label={item.label} 
              icon={item.icon} 
            />
          ))}
          {userProfile.isInAutonomyPhase && (
            <div className="mt-4 pt-4 border-t-2 border-spartan-border">
              <NavLink 
                page={autonomyNavItem.page} 
                label={autonomyNavItem.label} 
                icon={autonomyNavItem.icon} 
              />
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-4 pt-4 border-t border-spartan-border">
          <LanguageSelector className="px-2" />
          <BluetoothConnector />
          <button 
            onClick={() => {
              toggleChat();
              closeSidebar();
            }}
            className="flex items-center w-full p-3 rounded-lg bg-spartan-surface hover:bg-spartan-border transition-colors text-spartan-text font-bold"
          >
            <BrainIcon className="w-6 h-6 text-spartan-gold"/>
            <span className="ml-4">{t('sidebar.aiConsultant')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
