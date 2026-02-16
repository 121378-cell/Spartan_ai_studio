import React from 'react';

const HormoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a9 9 0 0014.28 3.97M3 9a9 9 0 0114.28-3.97" />
    </svg>
);

export default HormoneIcon;

