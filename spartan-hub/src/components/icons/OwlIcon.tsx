
import React from 'react';

const OwlIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a4.5 4.5 0 004.5-4.5V8.25a4.5 4.5 0 00-4.5-4.5H6.75a4.5 4.5 0 00-4.5 4.5v6.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75a1.5 1.5 0 01-3 0 1.5 1.5 0 013 0z" />
    </svg>
);

export default OwlIcon;

