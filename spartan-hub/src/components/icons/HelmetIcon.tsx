import React from 'react';

const HelmetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12H15V16H9V12Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3V6" />
  </svg>
);

export default HelmetIcon;
