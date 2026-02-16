import React, { useState, useEffect } from 'react';
import { Suggestion } from '../services/suggestionService';
import SuggestionCard from './SuggestionCard';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onDismiss?: (id: string) => void;
  title?: string;
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ 
  suggestions, 
  onDismiss,
  title = "Sugerencias Automáticas"
}) => {
  const [visibleSuggestions, setVisibleSuggestions] = useState<Suggestion[]>(suggestions);
  
  useEffect(() => {
    setVisibleSuggestions(suggestions);
  }, [suggestions]);

  const handleDismiss = (id: string) => {
    setVisibleSuggestions(prev => prev.filter(suggestion => suggestion.id !== id));
    if (onDismiss) {
      onDismiss(id);
    }
  };

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-spartan-surface rounded-lg p-4 mb-6">
      <h2 className="text-lg font-bold text-spartan-text mb-3">{title}</h2>
      <div className="space-y-2">
        {visibleSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            title={suggestion.title}
            description={suggestion.description}
            action={suggestion.action}
            severity={suggestion.severity}
            onDismiss={() => handleDismiss(suggestion.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default SuggestionPanel;
