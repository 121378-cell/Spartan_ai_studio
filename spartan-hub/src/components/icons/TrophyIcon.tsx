import React from 'react';

const TrophyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 1011.64-8.02A9.753 9.753 0 0012 3.75c-1.353 0-2.66.273-3.86.77M16.5 18.75c-2.097 0-3.929-.86-5.25-2.25m5.25 2.25c2.097 0 3.929-.86 5.25-2.25M4.5 10.5a8.25 8.25 0 0115 0" />
    </svg>
);

export default TrophyIcon;
