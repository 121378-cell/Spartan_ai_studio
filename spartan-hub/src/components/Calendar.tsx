import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import type { Routine } from '../types.ts';
import FocusIcon from './icons/FocusIcon.tsx';
import { speak } from '../services/ttsService.ts';

const Calendar: React.FC = () => {
  const { workoutHistory, scheduledWorkouts, routines, rescheduleWorkout, showToast } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; x: number; y: number } | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);


  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const focusColors: { [key: string]: string } = {
      'Fuerza': 'bg-red-600',
      'Hipertrofia': 'bg-blue-600',
      'Fuerza & Hipertrofia': 'bg-purple-600',
      'Resistencia': 'bg-green-600',
      'HIIT': 'bg-yellow-500',
      'Default': 'bg-spartan-gold'
  }

  const generateFocusInstruction = (routine: Routine): string => {
    let instruction = `Foco: ${routine.focus}.`;
    if (routine.objective) {
        instruction += `\nObjetivo: "${routine.objective}"`;
    }
    const mainLift = routine.blocks.flatMap(b => b.exercises).find(ex => ex.rir !== undefined);
    if (mainLift) {
        instruction += `\nClave: RIR ${mainLift.rir} en ${mainLift.name}.`;
    }
    return instruction;
  };

  const showTooltip = (content: string, e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
        visible: true,
        content,
        x: rect.left + rect.width / 2,
        y: rect.top - 10
    });
  };

  const hideTooltip = () => {
    if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
    }
    setTooltip(null);
  };
  
  const handleTouchStart = (content: string, e: React.TouchEvent) => {
    longPressTimeoutRef.current = window.setTimeout(() => {
        showTooltip(content, e);
    }, 500); // 500ms for long press
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sourceDate: string) => {
      e.dataTransfer.setData('application/json', JSON.stringify({ sourceDate }));
      e.dataTransfer.effectAllowed = 'move';
      hideTooltip();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDate: string) => {
      e.preventDefault();
      setDragOverDate(null);
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.sourceDate === targetDate) {
          return; // No change needed
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDateObj = new Date(targetDate + 'T00:00:00'); 
      
      const isFutureOrToday = targetDateObj.getTime() >= today.getTime();
      const isTargetAScheduledDay = scheduledWorkouts.some(sw => sw.date === targetDate);

      // LDC1.5: Block moves to designated future rest days.
      if (isFutureOrToday && !isTargetAScheduledDay) {
          const message = "Esta es tu ventana de descanso neural. Mover la sesión rompería la recuperación necesaria para tu progreso a largo plazo.";
          showToast(message);
          speak(message);
          return; // Block the move
      }
      
      rescheduleWorkout(data.sourceDate, targetDate);
  };

  const renderDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border border-spartan-border rounded-md opacity-50"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dayString = dayDate.toISOString().split('T')[0];
        const isToday = dayDate.getTime() === today.getTime();
        const isFutureOrToday = dayDate.getTime() >= today.getTime();
        
        const workoutsForDay = workoutHistory.filter(wh => wh.date === dayString);
        const scheduledForDay = scheduledWorkouts.find(sw => sw.date === dayString);
        
        let dayClass = `p-2 border border-spartan-border rounded-md flex flex-col justify-start items-start min-h-[120px] transition-colors relative ${dragOverDate === dayString ? 'drag-over' : ''}`;
        if (isToday) {
            dayClass += " bg-spartan-surface";
        } else if (isFutureOrToday && !scheduledForDay && workoutsForDay.length === 0) {
            dayClass += " bg-spartan-surface/20 opacity-70"; // Rest Day Style
        }
        
        days.push(
            <div 
              key={day} 
              className={dayClass}
              data-date={dayString}
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(dayString); }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => handleDrop(e, dayString)}
            >
                <span className={`font-bold ${isToday ? 'text-spartan-gold' : 'text-spartan-text'}`}>{day}</span>
                <div className="mt-1 space-y-1 w-full">
                    {workoutsForDay.map((workout, index) => {
                        const colorKey = Object.keys(focusColors).find(key => workout.focus.includes(key)) || 'Default';
                        return (
                             <div key={index} className={`text-xs text-white px-2 py-1 rounded-md truncate ${focusColors[colorKey]}`}>
                                {workout.routineName}
                            </div>
                        )
                    })}
                    {scheduledForDay && !workoutsForDay.some(w => w.routineName === routines.find(r => r.id === scheduledForDay.routineId)?.name) && (
                        (() => {
                            const routine = routines.find(r => r.id === scheduledForDay.routineId);
                            if (!routine) return null;
                            const focusInstruction = generateFocusInstruction(routine);
                            return (
                                <div 
                                    className="text-sm font-bold text-spartan-gold px-2 py-1 rounded-md truncate border-2 border-dashed border-spartan-gold/50 cursor-grab active:cursor-grabbing"
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, dayString)}
                                    onMouseEnter={(e) => showTooltip(focusInstruction, e)}
                                    onMouseLeave={hideTooltip}
                                    onTouchStart={(e) => handleTouchStart(focusInstruction, e)}
                                    onTouchEnd={hideTooltip}
                                >
                                    {routine.focus}
                                </div>
                            );
                        })()
                    )}
                </div>
            </div>
        );
    }
    return days;
  };
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="animate-fadeIn">
      {tooltip?.visible && (
        <div 
            className="fixed z-50 bg-spartan-card p-3 rounded-lg shadow-xl max-w-xs text-sm border border-spartan-border whitespace-pre-wrap animate-fadeIn"
            style={{ 
                top: tooltip.y, 
                left: tooltip.x,
                transform: 'translate(-50%, -100%)'
            }}
        >
          <div className="flex items-start gap-2">
            <FocusIcon className="w-5 h-5 text-spartan-gold flex-shrink-0 mt-0.5"/>
            <p>{tooltip.content}</p>
          </div>
        </div>
      )}
      <h1 className="text-4xl font-bold mb-6 text-spartan-gold">Calendario de Entrenamiento</h1>
      <div className="bg-spartan-surface p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-spartan-card">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-bold">{monthNames[month]} {year}</h2>
          <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-spartan-card">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map(day => (
            <div key={day} className="font-bold text-center text-spartan-text-secondary">{day}</div>
          ))}
          {renderDays()}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
