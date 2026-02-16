import React from 'react';

const DistractedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v.01M12 6v.01M12 9v.01M12 12v.01M12 15v.01M12 18v.01M21 12h-.01M18 12h-.01M15 12h-.01M9 12H8.99M6 12H5.99M3 12H2.99" opacity="0.3" />
    </svg>
);
export default DistractedIcon;

