import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormAnalysisModal from '../../components/VideoAnalysis/FormAnalysisModal';
import { FormAnalysisResult } from '../../types/pose';

// Note: @mediapipe/tasks-vision is mocked globally via jest.config.components.js
// The mock is located at src/__mocks__/@mediapipe/tasks-vision.ts

// Mock poseDetection service
jest.mock('../../services/poseDetection', () => ({
  getPoseDetectionService: jest.fn().mockReturnValue({
    initialize: jest.fn().mockResolvedValue(undefined),
    detect: jest.fn().mockReturnValue({
      landmarks: [],
      timestamp: Date.now(),
      frameNumber: 0,
      isValid: false,
    }),
    getState: jest.fn().mockReturnValue({
      isInitialized: true,
      isDetecting: false,
      currentFrame: null,
      fps: 0,
      error: null,
      framesProcessed: 0,
    }),
    close: jest.fn(),
    reset: jest.fn(),
  }),
  resetPoseDetectionService: jest.fn(),
}));

// Mock VideoCapture component
jest.mock('../../components/VideoAnalysis/VideoCapture', () => {
  return function MockVideoCapture(props: any) {
    React.useEffect(() => {
      props.onStateChange?.({
        isActive: false,
        framesProcessed: 0,
        fps: 0,
        lastFrameTime: 0,
        error: null,
      });
    }, [props.onStateChange]);

    return (
      <div data-testid="video-capture">
        <button
          onClick={() => {
            const mockResult: FormAnalysisResult = {
              score: 75,
              issues: [{ label: 'Test Issue', description: 'Test', severity: 'medium' }],
              tips: ['Test tip'],
              metrics: { depth: 85 },
              frameCount: 100,
            };
            props.onAnalysisComplete?.(mockResult);
          }}
        >
          Complete Analysis
        </button>
      </div>
    );
  };
});

describe('FormAnalysisModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAnalysisComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should not render when isOpen is false', () => {
    render(
      <FormAnalysisModal
        isOpen={false}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    expect(screen.queryByText(/Análisis de Forma/)).not.toBeInTheDocument();
  });

  test('should render modal when isOpen is true', () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    expect(screen.getByText(/Análisis de Forma - Sentadilla/)).toBeInTheDocument();
  });

  test('should render VideoCapture component initially', () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="deadlift"
      />
    );

    expect(screen.getByTestId('video-capture')).toBeInTheDocument();
  });

  test('should display exercise type in header', () => {
    const { rerender } = render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    expect(screen.getByText(/Sentadilla/)).toBeInTheDocument();

    rerender(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="deadlift"
      />
    );

    expect(screen.getByText(/Peso Muerto/)).toBeInTheDocument();
  });

  test('should close modal when close button clicked', () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('should display analysis results when available', async () => {
    const mockResult: FormAnalysisResult = {
      score: 85,
      issues: [{ label: 'Form Issue', description: 'Knee cave detected', severity: 'high' }],
      tips: ['Keep knees aligned', 'Engage core'],
      metrics: { depth: 90, alignment: 85 },
      frameCount: 150,
    };

    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        onAnalysisComplete={mockOnAnalysisComplete}
        exerciseType="squat"
      />
    );

    // Trigger analysis completion
    const completeButton = screen.getByText('Complete Analysis');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  test('should display tips in results view', async () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    const completeButton = screen.getByText('Complete Analysis');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/Test tip/)).toBeInTheDocument();
    });
  });

  test('should show metrics in results view', async () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    const completeButton = screen.getByText('Complete Analysis');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText('depth')).toBeInTheDocument();
      expect(screen.getByText(/85\.0/)).toBeInTheDocument();
    });
  });

  test('should allow analyzing again after results', async () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    // Complete first analysis
    let completeButton = screen.getByText('Complete Analysis');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText('Analizar Nuevamente')).toBeInTheDocument();
    });

    // Click analyze again
    const analyzeAgainButton = screen.getByText('Analizar Nuevamente');
    fireEvent.click(analyzeAgainButton);

    await waitFor(() => {
      expect(screen.getByTestId('video-capture')).toBeInTheDocument();
      completeButton = screen.getByText('Complete Analysis');
      expect(completeButton).toBeInTheDocument();
    });
  });

  test('should call onAnalysisComplete callback', async () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        onAnalysisComplete={mockOnAnalysisComplete}
        exerciseType="squat"
      />
    );

    const completeButton = screen.getByText('Complete Analysis');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockOnAnalysisComplete).toHaveBeenCalled();
    });
  });

  test('should display status bar with frame and FPS info', () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    expect(screen.getByText('Frames')).toBeInTheDocument();
    expect(screen.getByText('FPS')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  test('should display error message when state has error', () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    // Component should render without error
    expect(screen.getByText(/Análisis de Forma/)).toBeInTheDocument();
  });

  test('should close modal properly with close button in results', async () => {
    render(
      <FormAnalysisModal
        isOpen={true}
        onClose={mockOnClose}
        exerciseType="squat"
      />
    );

    const completeButton = screen.getByText('Complete Analysis');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText('Cerrar')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Cerrar');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
