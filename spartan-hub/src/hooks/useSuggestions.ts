import { useState, useEffect, useCallback } from 'react';
import { Suggestion, SuggestionService } from '../services/suggestionService';
import { UserProfile } from '../types';

interface UseSuggestionsProps {
  userProfile: UserProfile;
  systemErrors?: string[];
}

export const useSuggestions = ({ userProfile, systemErrors = [] }: UseSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get automatic suggestions based on user profile and system errors
  const refreshSuggestions = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Get suggestions based on user profile
      const profileSuggestions = SuggestionService.getAutomaticSuggestions(userProfile, systemErrors);
      
      // Filter out dismissed suggestions
      const filteredSuggestions = profileSuggestions.filter(
        suggestion => !dismissedSuggestions.has(suggestion.id)
      );
      
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, systemErrors, dismissedSuggestions]);

  // Get suggestions for a specific AI error
  const getSuggestionsForAiError = useCallback((error: string) => {
    try {
      const errorSuggestions = SuggestionService.getSuggestionsForAiError(error);
      
      // Filter out dismissed suggestions
      const filteredSuggestions = errorSuggestions.filter(
        suggestion => !dismissedSuggestions.has(suggestion.id)
      );
      
      setSuggestions(prev => [...prev, ...filteredSuggestions]);
    } catch (error) {
      console.error('Error getting AI error suggestions:', error);
    }
  }, [dismissedSuggestions]);

  // Get setup suggestions for new users
  const getSetupSuggestions = useCallback(() => {
    try {
      const setupSuggestions = SuggestionService.getSetupSuggestions();
      
      // Filter out dismissed suggestions
      const filteredSuggestions = setupSuggestions.filter(
        suggestion => !dismissedSuggestions.has(suggestion.id)
      );
      
      setSuggestions(prev => [...prev, ...filteredSuggestions]);
    } catch (error) {
      console.error('Error getting setup suggestions:', error);
    }
  }, [dismissedSuggestions]);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(id));
    setSuggestions(prev => prev.filter(suggestion => suggestion.id !== id));
  }, []);

  // Clear all dismissed suggestions
  const clearDismissedSuggestions = useCallback(() => {
    setDismissedSuggestions(new Set());
  }, []);

  // Refresh suggestions when userProfile or systemErrors change
  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

  return {
    suggestions,
    isLoading,
    refreshSuggestions,
    getSuggestionsForAiError,
    getSetupSuggestions,
    dismissSuggestion,
    clearDismissedSuggestions
  };
};
