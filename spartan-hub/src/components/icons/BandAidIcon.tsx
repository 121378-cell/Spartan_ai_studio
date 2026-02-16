import React from 'react';

const BandAidIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.75l-1.5-1.5-1.5 1.5-1.5-1.5-1.5 1.5L3 6.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 17.25l1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5M4.5 21v-3.375c0-.621.504-1.125 1.125-1.125h12.75c.621 0 1.125.504 1.125 1.125V21" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3v3.375c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25v-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 14.25v-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12h10.5" />
    </svg>
);

export default BandAidIcon;

