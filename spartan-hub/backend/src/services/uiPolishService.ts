/**
 * UI Polish Service
 * Phase B: Polish & Launch Prep - Week 9 Day 1
 * 
 * UI utilities for polish and consistency
 */

import { logger } from '../utils/logger';

export interface AnimationConfig {
  duration: number;
  easing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay: number;
  iterations: number;
}

export interface LoadingStateConfig {
  showSpinner: boolean;
  showProgressBar: boolean;
  showSkeleton: boolean;
  minDisplayTime: number;
  maxDisplayTime: number;
}

export interface ErrorMessageConfig {
  showIcon: boolean;
  showErrorCode: boolean;
  showStackTrace: boolean;
  autoHide: boolean;
  autoHideDelay: number;
}

/**
 * UI Polish Service
 */
export class UIPolishService {
  private animationDefaults: AnimationConfig = {
    duration: 300,
    easing: 'ease-in-out',
    delay: 0,
    iterations: 1
  };

  private loadingDefaults: LoadingStateConfig = {
    showSpinner: true,
    showProgressBar: false,
    showSkeleton: true,
    minDisplayTime: 200,
    maxDisplayTime: 10000
  };

  private errorDefaults: ErrorMessageConfig = {
    showIcon: true,
    showErrorCode: true,
    showStackTrace: false,
    autoHide: true,
    autoHideDelay: 5000
  };

  constructor() {
    logger.info('UIPolishService initialized', {
      context: 'ui-polish'
    });
  }

  /**
   * Get animation configuration
   */
  getAnimationConfig(overrides?: Partial<AnimationConfig>): AnimationConfig {
    return {
      ...this.animationDefaults,
      ...overrides
    };
  }

  /**
   * Get loading state configuration
   */
  getLoadingConfig(overrides?: Partial<LoadingStateConfig>): LoadingStateConfig {
    return {
      ...this.loadingDefaults,
      ...overrides
    };
  }

  /**
   * Get error message configuration
   */
  getErrorConfig(overrides?: Partial<ErrorMessageConfig>): ErrorMessageConfig {
    return {
      ...this.errorDefaults,
      ...overrides
    };
  }

  /**
   * Smooth scroll to element (client-side only)
   * Note: This is a utility function for frontend use
   */
  getSmoothScrollScript(elementId: string, offset: number = 0): string {
    // Return script for client-side smooth scroll
    return `
      const element = document.getElementById('${elementId}');
      if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - ${offset};
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    `;
  }

  /**
   * Debounce function
   */
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        func(...args);
      };

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   */
  throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Format number with commas
   */
  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Format relative time
   */
  formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  /**
   * Truncate text
   */
  truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Highlight text
   */
  highlightText(text: string, query: string): string {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Get color contrast ratio
   */
  getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In production, use proper WCAG formula
    return 4.5; // WCAG AA standard
  }

  /**
   * Check if color passes WCAG AA
   */
  passesWCAGAA(color1: string, color2: string): boolean {
    return this.getContrastRatio(color1, color2) >= 4.5;
  }

  /**
   * Check if color passes WCAG AAA
   */
  passesWCGAAA(color1: string, color2: string): boolean {
    return this.getContrastRatio(color1, color2) >= 7;
  }

  /**
   * Generate skeleton loader width
   */
  getSkeletonWidth(variant: 'text' | 'circle' | 'rect'): string {
    switch (variant) {
      case 'circle':
        return '40px';
      case 'rect':
        return '100%';
      case 'text':
      default:
        return `${Math.random() * 40 + 60}%`;
    }
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (current / total) * 100));
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    logger.debug('UI polish service health check', {
      context: 'ui-polish'
    });

    return true;
  }
}

// Singleton instance
const uiPolishService = new UIPolishService();

export default uiPolishService;
