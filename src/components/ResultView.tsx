import AnalysisResult from './AnalysisResult';
import type { IngredientAnalysis } from '../services/openaiService';
import React from 'react';

interface ResultViewProps {
  capturedImage: string;
  isAnalyzing: boolean;
  error: string | null;
  analysis: IngredientAnalysis | null;
  showToleranceQuestion: boolean;
}

const getErrorIcon = (errorMessage: string) => {
  if (errorMessage.includes('API-Schlüssel')) return '🔑';
  if (errorMessage.includes('Netzwerk')) return '🌐';
  if (errorMessage.includes('Server')) return '🖥️';
  if (errorMessage.includes('Bild')) return '📷';
  if (errorMessage.includes('Inhaltsstoffe')) return '🔍';
  if (errorMessage.includes('Limit')) return '⏰';
  return '❌';
};

const getErrorSuggestion = (errorMessage: string) => {
  if (errorMessage.includes('API-Schlüssel')) {
    return 'Überprüfen Sie Ihren OpenAI API-Schlüssel oder ändern Sie ihn über die Einstellungen.';
  }
  if (errorMessage.includes('Netzwerk')) {
    return 'Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
  }
  if (errorMessage.includes('Server')) {
    return 'Die OpenAI-Server sind temporär überlastet. Bitte versuchen Sie es in einigen Minuten erneut.';
  }
  if (errorMessage.includes('Bild')) {
    return 'Stellen Sie sicher, dass das Bild klar, gut beleuchtet und die Inhaltsstoffe gut lesbar sind.';
  }
  if (errorMessage.includes('Inhaltsstoffe')) {
    return 'Positionieren Sie die Kamera so, dass alle Inhaltsstoffe sichtbar sind.';
  }
  if (errorMessage.includes('Limit')) {
    return 'Warten Sie einen Moment und versuchen Sie es dann erneut.';
  }
  return 'Versuchen Sie es erneut oder starten Sie einen neuen Scan.';
};

const ResultView: React.FC<ResultViewProps> = ({
  capturedImage,
  isAnalyzing,
  error,
  analysis,
  showToleranceQuestion,
}) => {
  const [showAnalysis, setShowAnalysis] = React.useState(true);

  if (!showAnalysis) return null;

  return (
    <div className="result-view">
      <h2>Gescannte Inhaltsstoffe</h2>
      <div className="image-preview">
        <img src={capturedImage} alt="Gescannte Inhaltsstoffe" />
      </div>

      {isAnalyzing && (
        <div className="analyzing">
          <div className="loading-spinner"></div>
          <p>Analysiere Inhaltsstoffe...</p>
          <p className="analyzing-hint">Dies kann einige Sekunden dauern</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <div className="error-header">
            <span className="error-icon">{getErrorIcon(error)}</span>
            <h3>Analyse fehlgeschlagen</h3>
          </div>
          <p className="error-text">{error}</p>
          <div className="error-suggestion">
            <strong>Vorschlag:</strong> {getErrorSuggestion(error)}
          </div>
          <div className="error-actions">
            <button onClick={() => setShowAnalysis(false)} className="action-button">
              ✖️ Schließen
            </button>
          </div>
        </div>
      )}

      {analysis && !isAnalyzing && !showToleranceQuestion && (
        <>
          <AnalysisResult analysis={analysis} onNewScan={() => setShowAnalysis(false)} />
          <div className="result-actions">
            <button onClick={() => setShowAnalysis(false)} className="action-button">
              ✖️ Schließen
            </button>
          </div>
        </>
      )}

      {!analysis && !isAnalyzing && !error && (
        <div className="result-controls">
          {/* Kein Button mehr hier */}
        </div>
      )}
    </div>
  );
};

export default ResultView; 