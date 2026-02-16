import React from 'react';

const LungsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75V17.25M12 6.75C13.6569 6.75 15 5.40685 15 3.75C15 2.09315 13.6569 0.75 12 0.75C10.3431 0.75 9 2.09315 9 3.75C9 5.40685 10.3431 6.75 12 6.75ZM8.25 17.25C8.25 19.4591 10.0409 21.25 12.25 21.25C14.4591 21.25 16.25 19.4591 16.25 17.25H8.25Z" transform="translate(0, 1)" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75C6.04086 9.75 4.25 11.5409 4.25 13.75V17.25H8.25V9.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9.75C17.9591 9.75 19.75 11.5409 19.75 13.75V17.25H15.75V9.75Z" />
    </svg>
);

export default LungsIcon;
