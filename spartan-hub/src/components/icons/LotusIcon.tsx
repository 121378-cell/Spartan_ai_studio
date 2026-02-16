import React from 'react';

const LotusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a2.25 2.25 0 002.25-2.25H9.75A2.25 2.25 0 0012 21z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 18.75h-7.5a3.75 3.75 0 01-3.75-3.75v-3.75a3.75 3.75 0 013.75-3.75h7.5a3.75 3.75 0 013.75 3.75v3.75a3.75 3.75 0 01-3.75 3.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.75A4.5 4.5 0 009.75 3 4.5 4.5 0 005.25 6.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 6.75A4.5 4.5 0 0114.25 3a4.5 4.5 0 014.5 4.5" />
    </svg>
);

export default LotusIcon;

