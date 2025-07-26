import AnalysisResult from './AnalysisResult';
import type { IngredientAnalysis } from '../../services/openaiService';
import React from 'react';
import VerticalMainLayout from '../VerticalMainLayout';
import ListsButtons from '../ingredients/ListsButtons';
import { t } from '../../i18n';

interface ResultViewProps {
  capturedImage: string;
  analysis: IngredientAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onShowLists: () => void;
}

const ResultView: React.FC<ResultViewProps> = React.memo(({ analysis, isAnalyzing, error, onClose, onRetry, onShowLists }) => {
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
          {!isAnalyzing && !error && analysis && (
            <AnalysisResult analysis={analysis} onActionDone={handleClose} />
          )}
        </>
      }
      bottom={
        <div className="result-actions">
          <button onClick={onRetry} className="scan-button" disabled={isAnalyzing}>
            🔄 {t('retry')}
          </button>
        </div>
      }
    />
  );
});

export default ResultView; 