import { useEffect, useState } from 'react';
import { type IngredientAnalysis } from '../services/openaiService';
import { IngredientListService } from '../services/ingredientLists';
import './AnalysisResult.css';

interface AnalysisResultProps {
  analysis: IngredientAnalysis;
}

interface IntoleranceWarning {
  ingredient: string;
  severity: 'high' | 'medium' | 'low';
}

export default function AnalysisResult({ analysis }: AnalysisResultProps) {
  const [intoleranceWarnings, setIntoleranceWarnings] = useState<IntoleranceWarning[]>([]);
  const [hasWarnings, setHasWarnings] = useState(false);
  const [displayedIngredients, setDisplayedIngredients] = useState<string[]>(analysis.ingredients);

  useEffect(() => {
    checkIntolerances();
    setDisplayedIngredients(analysis.ingredients);
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

  const handleAddAllToPositiveList = () => {
    const positiveList = IngredientListService.getPositiveList();
    const newPositiveList = [...positiveList, ...displayedIngredients];
    IngredientListService.savePositiveList(newPositiveList);
  };

  const handleAddAllToNegativeList = () => {
    const negativeList = IngredientListService.getNegativeList();
    const newNegativeList = [...negativeList, ...displayedIngredients];
    IngredientListService.saveNegativeList(newNegativeList);
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setDisplayedIngredients(prev => prev.filter(ingredient => ingredient !== ingredientToRemove));
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
          {displayedIngredients.length} Inhaltsstoffe erkannt
        </p>
      </div>

      {/* Hinweis, wenn keine Inhaltsstoffe erkannt wurden */}
      {displayedIngredients.length === 0 && (
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
      {displayedIngredients.length > 0 && (
        <div className="ingredients-section">
          <h3>🔍 Erkannte Inhaltsstoffe</h3>
          <div className="ingredients-grid">
            {displayedIngredients.map((ingredient, index) => {
              const isIntolerant = intoleranceWarnings.some(
                warning => warning.ingredient.toLowerCase() === ingredient.toLowerCase()
              );
              
              return (
                <div 
                  key={index} 
                  className={`ingredient-card ${isIntolerant ? 'intolerant' : ''}`}
                  onClick={() => handleRemoveIngredient(ingredient)}
                  title="Klicken zum Löschen"
                >
                  <span className="ingredient-name">{ingredient}</span>
                  {isIntolerant && (
                    <span className="intolerance-badge">🚨 Unverträglich</span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Buttons zum Hinzufügen aller Inhaltsstoffe */}
          <div className="ingredients-actions">
            <button onClick={handleAddAllToPositiveList} className="add-all-button positive">
              ✅ Alle zu Verträglichkeitsliste hinzufügen
            </button>
            <button onClick={handleAddAllToNegativeList} className="add-all-button negative">
              ❌ Alle zu Unverträglichkeitsliste hinzufügen
            </button>
          </div>
        </div>
      )}

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

      {/* Button für neuen Scan entfernt */}
    </div>
  );
} 