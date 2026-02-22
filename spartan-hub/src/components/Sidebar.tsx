import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
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

interface NavItemProps {
  page: Page;
  label: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, toggleChat, userProfile } = useAppContext();

  const navItems: NavItemProps[] = [
    { page: 'dashboard', label: 'Panel', icon: <HomeIcon className="w-6 h-6" /> },
    { page: 'routines', label: 'Rutinas', icon: <DumbbellIcon className="w-6 h-6" /> },
    { page: 'exercise-library', label: 'Armería', icon: <UserIcon className="w-6 h-6" /> },
    { page: 'form-analysis', label: 'Análisis de Forma', icon: <VideoCameraIcon className="w-6 h-6" /> },
    { page: 'progress', label: 'Progreso', icon: <ChartBarIcon className="w-6 h-6" /> },
    { page: 'calendar', label: 'Calendario', icon: <CalendarIcon className="w-6 h-6" /> },
    { page: 'legend', label: 'Leyenda', icon: <LaurelWreathIcon className="w-6 h-6" /> },
    { page: 'discipline', label: 'Disciplina', icon: <FireIcon className="w-6 h-6" /> },
    { page: 'flow', label: 'Flujo', icon: <FocusIcon className="w-6 h-6" /> },
    { page: 'reconditioning', label: 'Reacondicionamiento', icon: <LotusIcon className="w-6 h-6" /> },
    { page: 'nutrition', label: 'Nutrición', icon: <NutritionIcon className="w-6 h-6" /> },
    { page: 'master-regulation', label: 'Regulación', icon: <RegulationIcon className="w-6 h-6" /> },
  ];

  if (userProfile.role === 'coach' || userProfile.role === 'admin') {
    navItems.unshift({ 
      page: 'coach-dashboard', 
      label: 'Coach Hub', 
      icon: <Users className="w-6 h-6" /> 
    });
  }

  if (userProfile.role === 'admin') {
    navItems.push({
      page: 'ai-dashboard',
      label: 'AI Dashboard',
      icon: <Cpu className="w-6 h-6" />
    });
  }
  
  const autonomyNavItem: NavItemProps = { 
      page: 'success-manual', 
      label: 'Manual', 
      icon: <BookIcon className="w-6 h-6" /> 
  };

  const NavLink: React.FC<NavItemProps> = ({ page, label, icon }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => setCurrentPage(page)}
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
    <aside className="w-64 bg-spartan-card p-4 flex flex-col h-screen sticky top-0">
      <div className="text-center my-4">
        <h1 className="text-3xl font-bold text-spartan-gold tracking-widest">SPARTAN</h1>
        <p className="text-xs text-spartan-text-secondary uppercase">Synergy AI</p>
      </div>
      <nav className="flex-1 mt-8">
        {navItems.map(item => <NavLink key={item.page} {...item} />)}
        {userProfile.isInAutonomyPhase && <div className="mt-4 pt-4 border-t-2 border-spartan-border"><NavLink {...autonomyNavItem} /></div>}
      </nav>
      <div className="mt-auto space-y-4">
        <BluetoothConnector />
        <button 
          onClick={toggleChat}
          className="flex items-center w-full p-3 rounded-lg bg-spartan-surface hover:bg-spartan-border transition-colors text-spartan-text font-bold"
        >
          <BrainIcon className="w-6 h-6 text-spartan-gold"/>
          <span className="ml-4">Consultor IA</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
