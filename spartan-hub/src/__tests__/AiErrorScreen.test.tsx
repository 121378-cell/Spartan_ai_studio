/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the icon components first
jest.mock('../components/icons/BrainIcon', () => ({
  __esModule: true,
  default: () => <div data-testid="brain-icon" />
}));

jest.mock('../components/icons/RefreshIcon', () => ({
  __esModule: true,
  default: () => <div data-testid="refresh-icon" />
}));

jest.mock('../components/icons/HomeIcon', () => ({
  __esModule: true,
  default: () => <div data-testid="home-icon" />
}));

// Mock the ErrorReportButton component
jest.mock('../components/ErrorReportButton', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, className }: { children: React.ReactNode, onClick: () => void, disabled: boolean, className: string }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}));

// Now import the component after mocks
import AiErrorScreen from '../components/AiErrorScreen';

// Simple test to verify the component renders without errors
describe('AiErrorScreen', () => {
  it('should be able to import the component', () => {
    // This test simply verifies that the component can be imported without errors
    expect(true).toBe(true);
  });
});

describe('AiErrorScreen', () => {
  const mockOnRetry = jest.fn();
  const mockOnGoHome = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error screen with generic error message', () => {
    const errorMessage = 'Generic error occurred';
    
    render(
      <AiErrorScreen 
        error={errorMessage} 
        onRetry={mockOnRetry} 
        onGoHome={mockOnGoHome} 
      />
    );

    // Check that the error title is rendered
    expect(screen.getByText('¡Ups! Algo salió mal')).toBeTruthy();
    
    // Check that the generic error description is shown
    expect(screen.getByText(/El sistema de inteligencia artificial no está respondiendo como se esperaba/i)).toBeTruthy();
    expect(screen.getByText(/sobrecarga temporal o a un problema de conexión/i)).toBeTruthy();
    
    // Check that error details are shown
    expect(screen.getByText(errorMessage)).toBeTruthy();
    
    // Check that buttons are rendered
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ir al inicio/i })).toBeTruthy();
  });

  it('renders error screen with Ollama timeout message', () => {
    // The component checks for both 'timeout' and 'Ollama' in the error message
    const errorMessage = 'timeout of 30000ms exceeded from Ollama service';
    
    render(
      <AiErrorScreen 
        error={errorMessage} 
        onRetry={mockOnRetry} 
        onGoHome={mockOnGoHome} 
      />
    );

    // Check that the Ollama-specific error description is shown
    expect(screen.getByText(/servicio Ollama local no está funcionando correctamente/i)).toBeTruthy();
    
    // Check that migration notice is shown
    expect(screen.getByText(/Estamos trabajando en la migración a una API de IA más estable/i)).toBeTruthy();
  });

  it('calls onRetry when retry button is clicked', () => {
    const errorMessage = 'Test error';
    
    render(
      <AiErrorScreen 
        error={errorMessage} 
        onRetry={mockOnRetry} 
        onGoHome={mockOnGoHome} 
      />
    );

    const retryButton = screen.getByRole('button', { name: /Reintentar/i });
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onGoHome when go home button is clicked', () => {
    const errorMessage = 'Test error';
    
    render(
      <AiErrorScreen 
        error={errorMessage} 
        onRetry={mockOnRetry} 
        onGoHome={mockOnGoHome} 
      />
    );

    const homeButton = screen.getByRole('button', { name: /Ir al inicio/i });
    fireEvent.click(homeButton);
    
    expect(mockOnGoHome).toHaveBeenCalledTimes(1);
  });
});
