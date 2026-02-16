// Detailed loading states for async operations
export enum DetailedLoadingState {
  // Initial state - no operation started
  IDLE = 'idle',
  
  // Operation initiated but not yet started
  INITIATED = 'initiated',
  
  // Establishing connection to server/service
  CONNECTING = 'connecting',
  
  // Sending request/data to server
  SENDING = 'sending',
  
  // Waiting for server response
  WAITING = 'waiting',
  
  // Receiving data from server
  RECEIVING = 'receiving',
  
  // Processing received data
  PROCESSING = 'processing',
  
  // Operation completed successfully
  COMPLETED = 'completed',
  
  // Operation failed
  FAILED = 'failed'
}

// Interface for detailed loading state with additional metadata
export interface LoadingStateDetails {
  state: DetailedLoadingState;
  progress?: number; // 0-100 percentage
  message?: string;  // Human-readable message
  timestamp: Date;   // When this state was set
  error?: string;    // Error message if failed
}

// Default loading state details
export const DEFAULT_LOADING_STATE: LoadingStateDetails = {
  state: DetailedLoadingState.IDLE,
  progress: 0,
  message: 'Ready',
  timestamp: new Date()
};

// Utility function to get a human-readable message for each state
export const getLoadingStateMessage = (state: DetailedLoadingState): string => {
  switch (state) {
    case DetailedLoadingState.IDLE:
      return 'Ready';
    case DetailedLoadingState.INITIATED:
      return 'Operation initiated';
    case DetailedLoadingState.CONNECTING:
      return 'Connecting to service';
    case DetailedLoadingState.SENDING:
      return 'Sending request';
    case DetailedLoadingState.WAITING:
      return 'Waiting for response';
    case DetailedLoadingState.RECEIVING:
      return 'Receiving data';
    case DetailedLoadingState.PROCESSING:
      return 'Processing data';
    case DetailedLoadingState.COMPLETED:
      return 'Completed successfully';
    case DetailedLoadingState.FAILED:
      return 'Operation failed';
    default:
      return 'Unknown state';
  }
};

// Utility function to estimate progress based on state
export const getEstimatedProgress = (state: DetailedLoadingState): number => {
  switch (state) {
    case DetailedLoadingState.IDLE:
      return 0;
    case DetailedLoadingState.INITIATED:
      return 5;
    case DetailedLoadingState.CONNECTING:
      return 15;
    case DetailedLoadingState.SENDING:
      return 30;
    case DetailedLoadingState.WAITING:
      return 50;
    case DetailedLoadingState.RECEIVING:
      return 70;
    case DetailedLoadingState.PROCESSING:
      return 85;
    case DetailedLoadingState.COMPLETED:
      return 100;
    case DetailedLoadingState.FAILED:
      return 0;
    default:
      return 0;
  }
};
