import { useEffect, useState } from 'react';
import { type IngredientAnalysis } from '../services/openaiService';
import { IngredientListService } from '../services/ingredientLists';
import './AnalysisResult.css';

interface AnalysisResultProps {
  analysis: IngredientAnalysis;
  onNewScan: () => void;
}

interface IntoleranceWarning {
  ingredient: string;
  severity: 'high' | 'medium' | 'low';
}

export default function AnalysisResult({ analysis, onNewScan }: AnalysisResultProps) {
  const [intoleranceWarnings, setIntoleranceWarnings] = useState<IntoleranceWarning[]>([]);
  const [hasWarnings, setHasWarnings] = useState(false);

  useEffect(() => {
    checkIntolerances();
  }, [analysis]);

  const checkIntolerances = () => {
    const negativeList = IngredientListService.getNegativeList();
    const normalizedNegativeList = IngredientListService.normalizeIngredients(negativeList);
    const normalizedAnalysisIngredients = IngredientListService.normalizeIngredients(analysis.ingredients);
    
    const warnings: IntoleranceWarning[] = [];
    
    normalizedAnalysisIngredients.forEach(ingredient => {
      if (normalizedNegativeList.includes(ingredient)) {
        warnings.push({
          ingredient: ingredient,
          severity: 'high' // Alle Unverträglichkeiten sind als hoch eingestuft
        });
      }
    });
    
    setIntoleranceWarnings(warnings);
    setHasWarnings(warnings.length > 0);
  };

  const getWarningIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '💡';
      default: return '⚠️';
    }
  };

  const getWarningColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa726';
      case 'low': return '#4ecdc4';
      default: return '#ffa726';
    }
  };

  return (
    <div className="analysis-result">
      <div className="result-header">
        <h2>📋 Analyseergebnis</h2>
        <p className="result-summary">
          {analysis.ingredients.length} Inhaltsstoffe erkannt
        </p>
      </div>

      {/* Hinweis, wenn keine Inhaltsstoffe erkannt wurden */}
      {analysis.ingredients.length === 0 && (
        <div className="no-ingredients-warning">
          <p>⚠️ Es konnten keine Inhaltsstoffe erkannt werden.</p>
        </div>
      )}

      {/* Unverträglichkeits-Warnungen */}
      {hasWarnings && (
        <div className="intolerance-warnings">
          <div className="warnings-header">
            <span className="warning-icon">🚨</span>
            <h3>Unverträglichkeiten erkannt</h3>
          </div>
          <div className="warnings-content">
            <p className="warning-description">
              Folgende Inhaltsstoffe stehen auf Ihrer Unverträglichkeitsliste:
            </p>
            <div className="warning-items">
              {intoleranceWarnings.map((warning, index) => (
                <div 
                  key={index} 
                  className="warning-item"
                  style={{ borderColor: getWarningColor(warning.severity) }}
                >
                  <span className="warning-item-icon">
                    {getWarningIcon(warning.severity)}
                  </span>
                  <span className="warning-item-text">{warning.ingredient}</span>
                </div>
              ))}
            </div>
            <div className="warning-advice">
              <p>
                <strong>💡 Empfehlung:</strong> 
                Vermeiden Sie dieses Produkt oder konsultieren Sie einen Arzt, 
                bevor Sie es verwenden.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Normale Analyseergebnisse */}
      <div className="ingredients-section">
        <h3>🔍 Erkannte Inhaltsstoffe</h3>
        <div className="ingredients-grid">
          {analysis.ingredients.map((ingredient, index) => {
            const isIntolerant = intoleranceWarnings.some(
              warning => warning.ingredient.toLowerCase() === ingredient.toLowerCase()
            );
            
            return (
              <div 
                key={index} 
                className={`ingredient-card ${isIntolerant ? 'intolerant' : ''}`}
              >
                <span className="ingredient-name">{ingredient}</span>
                {isIntolerant && (
                  <span className="intolerance-badge">🚨 Unverträglich</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Allergene */}
      {analysis.allergens.length > 0 && (
        <div className="allergens-section">
          <h3>⚠️ Allergene</h3>
          <div className="allergens-grid">
            {analysis.allergens.map((allergen, index) => (
              <div key={index} className="allergen-card">
                <span className="allergen-icon">⚠️</span>
                <span className="allergen-name">{allergen}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nährwert */}
      {analysis.nutrition && (
        <div className="nutrition-section">
          <h3>🍎 Nährwert</h3>
          <p className="nutrition-text">{analysis.nutrition}</p>
        </div>
      )}

      {/* Zusammenfassung */}
      {analysis.summary && (
        <div className="summary-section">
          <h3>📝 Zusammenfassung</h3>
          <p className="summary-text">{analysis.summary}</p>
        </div>
      )}

      <div className="result-actions">
        <button onClick={onNewScan} className="new-scan-button">
          🔄 Neuen Scan starten
        </button>
      </div>
    </div>
  );
} 