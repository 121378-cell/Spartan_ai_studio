import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { DetailedLoadingState, LoadingStateDetails, DEFAULT_LOADING_STATE } from '../components/DetailedLoadingState';

// Define the shape of our loading state context
interface LoadingStateContextType {
  loadingStates: Record<string, LoadingStateDetails>;
  setLoadingState: (key: string, state: LoadingStateDetails) => void;
  clearLoadingState: (key: string) => void;
  getLoadingState: (key: string) => LoadingStateDetails;
}

// Create the context with default values
const LoadingStateContext = createContext<LoadingStateContextType>({
  loadingStates: {},
  setLoadingState: () => {},
  clearLoadingState: () => {},
  getLoadingState: () => DEFAULT_LOADING_STATE
});

// Define action types for our reducer
type LoadingAction =
  | { type: 'SET_LOADING_STATE'; key: string; state: LoadingStateDetails }
  | { type: 'CLEAR_LOADING_STATE'; key: string }
  | { type: 'CLEAR_ALL_LOADING_STATES' };

// Reducer to manage loading states
const loadingStateReducer = (
  state: Record<string, LoadingStateDetails>,
  action: LoadingAction
): Record<string, LoadingStateDetails> => {
  switch (action.type) {
    case 'SET_LOADING_STATE':
      return {
        ...state,
        [action.key]: action.state
      };
    case 'CLEAR_LOADING_STATE':
      const newState = { ...state };
      delete newState[action.key];
      return newState;
    case 'CLEAR_ALL_LOADING_STATES':
      return {};
    default:
      return state;
  }
};

// Provider component
export const LoadingStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingStates, dispatch] = useReducer(loadingStateReducer, {});

  const setLoadingState = (key: string, state: LoadingStateDetails) => {
    dispatch({ type: 'SET_LOADING_STATE', key, state });
  };

  const clearLoadingState = (key: string) => {
    dispatch({ type: 'CLEAR_LOADING_STATE', key });
  };

  const getLoadingState = (key: string): LoadingStateDetails => {
    return loadingStates[key] || DEFAULT_LOADING_STATE;
  };

  return (
    <LoadingStateContext.Provider
      value={{
        loadingStates,
        setLoadingState,
        clearLoadingState,
        getLoadingState
      }}
    >
      {children}
    </LoadingStateContext.Provider>
  );
};

// Custom hook to use the loading state context
export const useLoadingState = () => {
  const context = useContext(LoadingStateContext);
  
  if (!context) {
    throw new Error('useLoadingState must be used within a LoadingStateProvider');
  }
  
  return context;
};

// Helper hook for managing a specific loading state
export const useSpecificLoadingState = (key: string) => {
  const { loadingStates, setLoadingState, clearLoadingState } = useLoadingState();
  
  const setState = (state: DetailedLoadingState, message?: string, progress?: number, error?: string) => {
    setLoadingState(key, {
      state,
      message: message || '',
      progress,
      timestamp: new Date(),
      error
    });
  };
  
  const clearState = () => {
    clearLoadingState(key);
  };
  
  return {
    loadingState: loadingStates[key] || DEFAULT_LOADING_STATE,
    setState,
    clearState
  };
};
