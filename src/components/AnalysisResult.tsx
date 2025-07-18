import React, { useEffect, useState } from 'react';
import { type IngredientAnalysis } from '../services/openaiService';
import { IngredientListService } from '../services/ingredientLists';
import type { NegativeIngredient } from '../services/ingredientLists';
import './AnalysisResult.css';

interface AnalysisResultProps {
  analysis: IngredientAnalysis;
  onActionDone?: () => void;
}

const AnalysisResult = React.memo(function AnalysisResult({ analysis, onActionDone }: AnalysisResultProps) {
  const [displayedIngredients, setDisplayedIngredients] = useState<string[]>(analysis.ingredients);

  useEffect(() => {
    checkIntolerances();
    setDisplayedIngredients(analysis.ingredients);
  }, [analysis]);

  const checkIntolerances = () => {
    const negativeList: NegativeIngredient[] = IngredientListService.getNegativeList();
    const negativeNames = negativeList.map(e => e.name);
    const normalizedNegativeList = IngredientListService.normalizeIngredients(negativeNames);
    const normalizedAnalysisIngredients = IngredientListService.normalizeIngredients(analysis.ingredients);
    normalizedAnalysisIngredients.forEach(ingredient => {
      if (normalizedNegativeList.includes(ingredient)) {
      }
    });
  };

  // Buttons sind immer aktiv, außer nach Klick (dann disabled)
  const [positiveClicked, setPositiveClicked] = useState(false);
  const [negativeClicked, setNegativeClicked] = useState(false);

  const handleAddAllToPositiveList = () => {
    setPositiveClicked(true);
    IngredientListService.addToPositiveList(displayedIngredients);
    if (onActionDone) onActionDone();
  };

  const handleAddAllToNegativeList = () => {
    setNegativeClicked(true);
    const positiveList = IngredientListService.getPositiveList();
    const toNegative = displayedIngredients.filter(ing => !positiveList.includes(ing));
    IngredientListService.addToNegativeList(toNegative);
    if (onActionDone) onActionDone();
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setDisplayedIngredients(prev => prev.filter(ingredient => ingredient !== ingredientToRemove));
  };

  // Zutaten sortieren: Unverträgliche zuerst, absteigend nach count
  const negativeList: NegativeIngredient[] = IngredientListService.getNegativeList();
  const normalizedNegativeList = IngredientListService.normalizeIngredients(negativeList.map(e => e.name));
  const intolerantIngredients = displayedIngredients.filter(ingredient => normalizedNegativeList.includes(IngredientListService.normalizeIngredient(ingredient)));
  const tolerantIngredients = displayedIngredients.filter(ingredient => !normalizedNegativeList.includes(IngredientListService.normalizeIngredient(ingredient)));
  // Sortiere die unverträglichen Zutaten nach count absteigend
  const intolerantIngredientsSorted = [...intolerantIngredients].sort((a, b) => {
    const countA = IngredientListService.getNegativeCount(a);
    const countB = IngredientListService.getNegativeCount(b);
    return countB - countA;
  });
  const sortedIngredients = [...intolerantIngredientsSorted, ...tolerantIngredients];

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

      {/* Unverträglichkeits-Warnungen entfernt */}

      {/* Normale Analyseergebnisse */}
      {displayedIngredients.length > 0 && (
        <div className="ingredients-section">
          <h3>🔍 Erkannte Inhaltsstoffe</h3>
          <div className="ingredients-grid">
            {sortedIngredients.map((ingredient, index) => {
              const isIntolerant = normalizedNegativeList.includes(IngredientListService.normalizeIngredient(ingredient));
              return isIntolerant ? (
                <div
                  key={index}
                  className="ingredient-chip intolerant-chip"
                  title="Unverträglich"
                  style={{ background: '#ff6b6b', color: '#fff', borderRadius: 16, padding: '6px 14px', margin: 4, display: 'inline-flex', alignItems: 'center', fontWeight: 500, fontSize: 15, cursor: 'default', border: 'none' }}
                >
                  <span style={{ marginRight: 6 }}>🚨</span>{ingredient}
                </div>
              ) : (
                <div
                  key={index}
                  className="ingredient-chip tolerant-chip"
                  onClick={() => handleRemoveIngredient(ingredient)}
                  title="Klicken zum Löschen"
                >
                  {ingredient}
                </div>
              );
            })}
          </div>
          
          {/* Buttons zum Hinzufügen aller Inhaltsstoffe */}
          <div className="ingredients-actions">
            <button onClick={handleAddAllToPositiveList} className="add-all-button positive" disabled={positiveClicked}>
              ✅ Gut verträglich
            </button>
            <button onClick={handleAddAllToNegativeList} className="add-all-button negative" disabled={negativeClicked}>
              ❌ Nicht verträglich
            </button>
          </div>
        </div>
      )}

      {/* Allergene entfernt */}
      {/* Zusammenfassung entfernt */}

      {/* Button für neuen Scan entfernt */}
    </div>
  );
});

export default AnalysisResult; 