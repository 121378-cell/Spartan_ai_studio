import React from 'react';

const SnowflakeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25v19.5m-6.364-6.364l12.728-12.728M20.25 12h-16.5m12.728-6.364L5.636 18.364" />
  </svg>
);

export default SnowflakeIcon;

