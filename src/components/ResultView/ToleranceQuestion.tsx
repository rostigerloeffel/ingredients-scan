import React, { useCallback } from 'react';
import { IngredientListService } from '../../services/ingredientLists';
import { type IngredientAnalysis } from '../../services/openaiService';
import './ToleranceQuestion.css';

interface ToleranceQuestionProps {
  analysis: IngredientAnalysis;
  onComplete: () => void;
  onCancel: () => void;
}

const ToleranceQuestion: React.FC<ToleranceQuestionProps> = React.memo((props) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedTolerance, setSelectedTolerance] = React.useState<'good' | 'bad' | null>(null);

  const handleToleranceSelect = useCallback(async (tolerance: 'good' | 'bad') => {
    setIsProcessing(true);
    setSelectedTolerance(tolerance);

    try {
      const normalizedIngredients = IngredientListService.normalizeIngredients(props.analysis.ingredients);

      if (tolerance === 'good') {
        IngredientListService.addToPositiveList(normalizedIngredients);
      } else {
        const positiveList = IngredientListService.getPositiveList();
        const toNegative = normalizedIngredients.filter(ing => !positiveList.includes(ing));
        IngredientListService.addToNegativeList(toNegative);
      }

      setTimeout(() => {
        props.onComplete();
      }, 1000);

    } catch (error) {
      console.error('Fehler beim Speichern der Verträglichkeit:', error);
      setIsProcessing(false);
      setSelectedTolerance(null);
    }
  }, [props.onComplete, props.analysis.ingredients]);

  const getToleranceText = useCallback((tolerance: 'good' | 'bad') => {
    return tolerance === 'good' ? 'Gut vertragen' : 'Schlecht vertragen';
  }, []);

  const getToleranceDescription = useCallback((tolerance: 'good' | 'bad') => {
    if (tolerance === 'good') {
      return 'Diese Inhaltsstoffe werden zu Ihrer Positivliste hinzugefügt und von der Negativliste entfernt.';
    } else {
      return 'Diese Inhaltsstoffe werden zu Ihrer Negativliste hinzugefügt (falls nicht bereits in der Positivliste).';
    }
  }, []);

  return (
    <div className="tolerance-question-overlay" aria-modal="true" role="dialog">
      <div className="tolerance-question-modal">
        <div className="question-header">
          <h2>🤔 Wie vertragen Sie dieses Produkt?</h2>
          <p>Bitte bewerten Sie Ihre Verträglichkeit der gescannten Inhaltsstoffe:</p>
        </div>

        <div className="ingredients-summary">
          <h3>Gescannte Inhaltsstoffe:</h3>
          <div className="ingredients-list">
            {props.analysis.ingredients.map((ingredient, index) => (
              <span key={index} className="ingredient-tag">
                {ingredient}
              </span>
            ))}
          </div>
        </div>

        {/* Hinweis, wenn keine Inhaltsstoffe erkannt wurden */}
        {props.analysis.ingredients.length === 0 && (
          <div className="no-ingredients-warning">
            <p>⚠️ Es konnten keine Inhaltsstoffe erkannt werden.</p>
          </div>
        )}

        <div className="tolerance-options">
          <button
            className={`tolerance-button good ${selectedTolerance === 'good' ? 'selected' : ''}`}
            onClick={() => handleToleranceSelect('good')}
            disabled={isProcessing || props.analysis.ingredients.length === 0}
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
            disabled={isProcessing || props.analysis.ingredients.length === 0}
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
          <button onClick={props.onCancel} className="cancel-button" disabled={isProcessing}>
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
});

export default ToleranceQuestion;