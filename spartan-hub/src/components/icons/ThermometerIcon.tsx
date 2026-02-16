import React from 'react';

const ThermometerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-3 3.75h3m-3 3.75h3m-3 3.75h3m-6.75-9.75a4.5 4.5 0 014.5-4.5h3a4.5 4.5 0 014.5 4.5v9.75a4.5 4.5 0 01-4.5 4.5h-3a4.5 4.5 0 01-4.5-4.5V6z" />
    </svg>
);

export default ThermometerIcon;

