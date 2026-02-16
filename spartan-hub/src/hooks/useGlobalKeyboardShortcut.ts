import { useEffect } from 'react';

export const useGlobalKeyboardShortcut = (
  keyCombination: string[],
  callback: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if all keys in the combination are pressed
      const isCombinationPressed = keyCombination.every(
        (key) => {
          switch (key.toLowerCase()) {
            case 'ctrl':
            case 'control':
              return event.ctrlKey;
            case 'shift':
              return event.shiftKey;
            case 'alt':
              return event.altKey;
            case 'meta':
            case 'cmd':
            case 'command':
              return event.metaKey;
            default:
              return event.key.toLowerCase() === key.toLowerCase();
          }
        }
      );

      // Check that only the required keys are pressed (prevent triggering when extra keys are pressed)
      const onlyRequiredKeys = keyCombination.length === 
        [event.ctrlKey, event.shiftKey, event.altKey, event.metaKey].filter(Boolean).length +
        (keyCombination.some(k => !['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'command'].includes(k.toLowerCase())) ? 1 : 0);

      if (isCombinationPressed && onlyRequiredKeys) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyCombination, callback]);
};
