import React from 'react';

const ClipboardCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.375a3 3 0 01-3-3V2.25a.75.75 0 00-1.5 0v1.125a3 3 0 01-3 3H8.25a.75.75 0 000 1.5h1.5a3 3 0 013 3v1.125a.75.75 0 001.5 0V12a3 3 0 013-3h1.5a.75.75 0 000-1.5h-1.5z" />
    </svg>
);

export default ClipboardCheckIcon;
