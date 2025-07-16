import AnalysisResult from './AnalysisResult';
import type { IngredientAnalysis } from '../services/openaiService';
import React from 'react';
import VerticalMainLayout from './VerticalMainLayout';
import ListsButtons from './ListsButtons';
import { t } from '../i18n';

interface ResultViewProps {
  capturedImage: string;
  analysis: IngredientAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  onClose: () => void;
  onShowLists: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({
  analysis,
  isAnalyzing,
  error,
  onClose,
  onShowLists,
}) => {
  const [showAnalysis, setShowAnalysis] = React.useState(true);

  const handleClose = () => {
    setShowAnalysis(false);
    onClose();
  };

  if (!showAnalysis) return null;

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={
        <>
          {isAnalyzing && (
            <div className="analyzing">
              <div className="loading-spinner"></div>
              <p>{t('analyzing_ingredients')}</p>
              <p className="analyzing-hint">{t('analyzing_hint')}</p>
            </div>
          )}
          {error && !isAnalyzing && error !== 'NO_OPENAI_KEY' && (
            <div className="error-message">
              <div className="error-header">
                <span className="error-icon">❌</span>
                <h3>{t('error_api')}</h3>
              </div>
              <p className="error-text">{error}</p>
            </div>
          )}
          {error === 'NO_OPENAI_KEY' && !isAnalyzing && (
            <div className="info-message">
              <div className="info-header">
                <span className="info-icon">ℹ️</span>
                <h3>{t('openai_key_not_configured')}</h3>
              </div>
              <p className="info-text">Die automatische KI-Analyse ist aktuell nicht verfügbar, weil kein OpenAI-Key hinterlegt ist. Die Texterkennung funktioniert trotzdem – du kannst die Zutatenliste wie gewohnt scannen.</p>
            </div>
          )}
          {!isAnalyzing && !error && analysis && (
            <AnalysisResult analysis={analysis} onActionDone={handleClose} />
          )}
        </>
      }
      bottom={
        <div className="result-actions">
          <button onClick={handleClose} className="scan-button">
            ✖️ {t('cancel')}
          </button>
        </div>
      }
    />
  );
};

export default ResultView; 