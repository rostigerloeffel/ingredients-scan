import { useState } from 'react';
import { IngredientListService } from '../services/ingredientLists';
import { type IngredientAnalysis } from '../services/openaiService';
import './ToleranceQuestion.css';

interface ToleranceQuestionProps {
  analysis: IngredientAnalysis;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ToleranceQuestion({ analysis, onComplete, onCancel }: ToleranceQuestionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTolerance, setSelectedTolerance] = useState<'good' | 'bad' | null>(null);

  const handleToleranceSelect = async (tolerance: 'good' | 'bad') => {
    setIsProcessing(true);
    setSelectedTolerance(tolerance);

    try {
      const normalizedIngredients = IngredientListService.normalizeIngredients(analysis.ingredients);

      if (tolerance === 'good') {
        // Füge zur Positivliste hinzu und entferne von Negativliste
        IngredientListService.addToPositiveList(normalizedIngredients);
      } else {
        // Füge zur Negativliste hinzu (nur wenn nicht in Positivliste)
        IngredientListService.addToNegativeList(normalizedIngredients);
      }

      // Kurze Verzögerung für visuelles Feedback
      setTimeout(() => {
        onComplete();
      }, 1000);

    } catch (error) {
      console.error('Fehler beim Speichern der Verträglichkeit:', error);
      setIsProcessing(false);
      setSelectedTolerance(null);
    }
  };

  const getToleranceText = (tolerance: 'good' | 'bad') => {
    return tolerance === 'good' ? 'Gut vertragen' : 'Schlecht vertragen';
  };

  const getToleranceDescription = (tolerance: 'good' | 'bad') => {
    if (tolerance === 'good') {
      return 'Diese Inhaltsstoffe werden zu Ihrer Positivliste hinzugefügt und von der Negativliste entfernt.';
    } else {
      return 'Diese Inhaltsstoffe werden zu Ihrer Negativliste hinzugefügt (falls nicht bereits in der Positivliste).';
    }
  };

  return (
    <div className="tolerance-question-overlay">
      <div className="tolerance-question-modal">
        <div className="question-header">
          <h2>🤔 Wie vertragen Sie dieses Produkt?</h2>
          <p>Bitte bewerten Sie Ihre Verträglichkeit der gescannten Inhaltsstoffe:</p>
        </div>

        <div className="ingredients-summary">
          <h3>Gescannte Inhaltsstoffe:</h3>
          <div className="ingredients-list">
            {analysis.ingredients.map((ingredient, index) => (
              <span key={index} className="ingredient-tag">
                {ingredient}
              </span>
            ))}
          </div>
        </div>

        <div className="tolerance-options">
          <button
            className={`tolerance-button good ${selectedTolerance === 'good' ? 'selected' : ''}`}
            onClick={() => handleToleranceSelect('good')}
            disabled={isProcessing}
          >
            <span className="tolerance-icon">✅</span>
            <div className="tolerance-content">
              <h3>Gut vertragen</h3>
              <p>Keine Beschwerden oder positive Reaktionen</p>
            </div>
          </button>

          <button
            className={`tolerance-button bad ${selectedTolerance === 'bad' ? 'selected' : ''}`}
            onClick={() => handleToleranceSelect('bad')}
            disabled={isProcessing}
          >
            <span className="tolerance-icon">❌</span>
            <div className="tolerance-content">
              <h3>Schlecht vertragen</h3>
              <p>Beschwerden, Unverträglichkeiten oder negative Reaktionen</p>
            </div>
          </button>
        </div>

        {selectedTolerance && (
          <div className="processing-feedback">
            <div className="processing-spinner"></div>
            <p>{getToleranceText(selectedTolerance)}</p>
            <p className="processing-description">
              {getToleranceDescription(selectedTolerance)}
            </p>
          </div>
        )}

        <div className="question-actions">
          <button onClick={onCancel} className="cancel-button" disabled={isProcessing}>
            Überspringen
          </button>
        </div>

        <div className="help-text">
          <p>
            <strong>💡 Tipp:</strong> Diese Bewertung hilft dabei, Ihre persönlichen 
            Verträglichkeitslisten zu erstellen und zukünftige Produktentscheidungen zu verbessern.
          </p>
        </div>
      </div>
    </div>
  );
} 