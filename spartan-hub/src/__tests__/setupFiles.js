/**
 * Setup file that runs BEFORE any modules are loaded.
 * This injects the React.act polyfill before @testing-library/react is imported.
 * 
 * This solves: "TypeError: React.act is not a function" in React 19.x
 */

// Get the React module and inject the act polyfill
const React = require('react');

if (React && !('act' in React)) {
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
  
  React.act = async (callback) => {
    const result = callback();
    if (result && typeof result.then === 'function') {
      await result;
    }
    await flushPromises();
    return result;
  };
}