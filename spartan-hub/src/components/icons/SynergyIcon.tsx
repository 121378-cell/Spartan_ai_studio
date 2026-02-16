import React from 'react';

const SynergyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 01-4.874-1.944m18.748 0A9.75 9.75 0 0016.5 18.75m-18.748 0L2.25 15m19.5 0l-1.499-3.75m-16.502 0L3.75 7.5m16.5 0L18.75 15M9 12.75h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75V9.75m3-3l-3 3-3-3" />
    </svg>
);

export default SynergyIcon;

