import React from 'react';

const GutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 3.75a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 3.75a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8.75c0 4 3 7.5 7 7.5s7-3.5 7-7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8.75c0-2 .5-3.5 2-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 8.75c0-2-.5-3.5-2-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.25v4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.75h6" />
    </svg>
);

export default GutIcon;
