import React from 'react';

const NeuroIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75H19.5M8.25 3.75V19.5M8.25 3.75C5.47 3.75 3.75 5.47 3.75 8.25C3.75 11.03 5.47 12.75 8.25 12.75V19.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 12.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
    </svg>
);

export default NeuroIcon;

