import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import FireIcon from './icons/FireIcon.tsx';
import CheckIcon from './icons/CheckIcon.tsx';

const HabitTrackerCard: React.FC = () => {
    const { userProfile, habitLogs, logHabitCompletion } = useAppContext();
    const primaryHabit = userProfile.keystoneHabits.length > 0 ? userProfile.keystoneHabits[0] : null;

    const [isSwiping, setIsSwiping] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const swipeStartXRef = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!primaryHabit) {
        return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = habitLogs.some(log => log.habitId === primaryHabit.id && log.date === today);

    const handleSwipeStart = (clientX: number) => {
        if (isCompletedToday || isSwiping) return;
        setIsSwiping(true);
        swipeStartXRef.current = clientX;
    };

    const handleSwipeMove = (clientX: number) => {
        if (!isSwiping || isCompletedToday) return;
        const deltaX = clientX - swipeStartXRef.current;
        const containerWidth = containerRef.current?.offsetWidth || 0;
        const thumbWidth = 56; // h-14 w-14
        const maxTranslate = containerWidth - thumbWidth - 8; // container width - thumb width - padding
        const newTranslateX = Math.max(0, Math.min(deltaX, maxTranslate));
        setTranslateX(newTranslateX);
    };

    const handleSwipeEnd = () => {
        if (!isSwiping || isCompletedToday) return;
        setIsSwiping(false);
        const containerWidth = containerRef.current?.offsetWidth || 0;
        const thumbWidth = 56;
        const maxTranslate = containerWidth - thumbWidth - 8;
        const threshold = maxTranslate * 0.8;

        if (translateX >= threshold) {
            logHabitCompletion(primaryHabit.id);
            setTranslateX(maxTranslate); // Snap to end
        } else {
            setTranslateX(0); // Snap back to start
        }
    };
    
    // Event handlers
    const onMouseDown = (e: React.MouseEvent) => handleSwipeStart(e.clientX);
    const onMouseMove = (e: React.MouseEvent) => handleSwipeMove(e.clientX);
    const onMouseUp = () => handleSwipeEnd();
    const onMouseLeave = () => { if (isSwiping) handleSwipeEnd(); };
    const onTouchStart = (e: React.TouchEvent) => handleSwipeStart(e.touches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => handleSwipeMove(e.touches[0].clientX);
    const onTouchEnd = () => handleSwipeEnd();

    return (
        <div 
            className="bg-spartan-card p-6 rounded-lg shadow-md"
            onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
            onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-spartan-gold">Hábito Anclado</h3>
                    <p className="font-bold text-xl">{primaryHabit.name}</p>
                    <p className="text-sm text-spartan-text-secondary">{primaryHabit.anchor}</p>
                </div>
                 <div className="text-center">
                    <p className="text-3xl font-bold text-spartan-gold flex items-center gap-1"><FireIcon className="w-6 h-6"/>{primaryHabit.currentStreak}</p>
                    <p className="text-xs text-spartan-text-secondary">RACHA</p>
                </div>
            </div>
            
            <div ref={containerRef} className="relative w-full h-16 bg-spartan-surface rounded-full flex items-center p-2 select-none">
                {isCompletedToday ? (
                     <div className="w-full h-full flex items-center justify-center bg-spartan-gold/20 rounded-full">
                        <CheckIcon className="w-8 h-8 text-spartan-gold animate-celebrate" />
                        <span className="font-bold text-spartan-gold ml-2">¡Completado!</span>
                    </div>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 h-full bg-spartan-gold/20 rounded-full" style={{ width: `${translateX + 56}px` }}></div>
                        <span className="absolute left-1/2 -translate-x-1/2 text-spartan-text-secondary font-semibold pointer-events-none">Desliza para completar</span>
                        <div
                            className="absolute top-1 left-1 w-14 h-14 bg-spartan-gold rounded-full flex items-center justify-center cursor-pointer"
                            style={{ transform: `translateX(${translateX}px)`, transition: isSwiping ? 'none' : 'transform 0.2s ease' }}
                            onMouseDown={onMouseDown}
                            onTouchStart={onTouchStart}
                        >
                             <FireIcon className="w-8 h-8 text-spartan-bg"/>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HabitTrackerCard;
