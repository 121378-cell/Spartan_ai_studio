import React from 'react';

const SoundWaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.207a.75.75 0 011.085.67V10.5m0 0h6m-6 0a.75.75 0 001.085.67l.415-.207M12 16.5v.375A1.125 1.125 0 0110.875 18h-1.5a1.125 1.125 0 01-1.125-1.125V16.5m3.75 0v.375a1.125 1.125 0 001.125 1.125h1.5a1.125 1.125 0 001.125-1.125V16.5m-3.75 0h3.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default SoundWaveIcon;

