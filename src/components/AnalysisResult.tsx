import React from 'react';
import type { IngredientAnalysis } from '../services/openaiService';

interface AnalysisResultProps {
  analysis: IngredientAnalysis;
  onNewScan: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onNewScan }) => {
  return (
    <div className="analysis-result">
      <h2>Zutatenanalyse</h2>
      
      <div className="analysis-sections">
        {/* Zutaten */}
        <div className="analysis-section">
          <h3>📋 Zutaten</h3>
          <div className="ingredients-list">
            {analysis.ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-item">
                • {ingredient}
              </div>
            ))}
          </div>
        </div>

        {/* Allergene */}
        {analysis.allergens.length > 0 && (
          <div className="analysis-section">
            <h3>⚠️ Allergene</h3>
            <div className="allergens-list">
              {analysis.allergens.map((allergen, index) => (
                <div key={index} className="allergen-item">
                  ⚠️ {allergen}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nährwert */}
        {analysis.nutrition && (
          <div className="analysis-section">
            <h3>🍎 Nährwert</h3>
            <div className="nutrition-info">
              {analysis.nutrition}
            </div>
          </div>
        )}

        {/* Zusammenfassung */}
        {analysis.summary && (
          <div className="analysis-section">
            <h3>📝 Zusammenfassung</h3>
            <div className="summary-text">
              {analysis.summary}
            </div>
          </div>
        )}
      </div>

      <div className="analysis-controls">
        <button onClick={onNewScan} className="new-scan-button">
          🔄 Neuen Scan starten
        </button>
      </div>
    </div>
  );
};

export default AnalysisResult; 