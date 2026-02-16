import React from 'react';

const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a15.045 15.045 0 01-4.5 0m4.5 0a3.751 3.751 0 00-3.75 0M12 12.75h.008v.008H12v-.008z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.28 11.47a2.25 2.25 0 013.22 0l.001.002a2.25 2.25 0 010 3.22l-6.75 6.75a2.25 2.25 0 01-3.22 0l-.002-.001a2.25 2.25 0 010-3.22l6.75-6.75z" />
    </svg>
);

export default LightBulbIcon;

