import { useState } from 'react'
import CameraScanner from './components/CameraScanner'
import AnalysisResult from './components/AnalysisResult'
import { OpenAIService, type IngredientAnalysis } from './services/openaiService'
import './App.css'
import './components/CameraScanner.css'
import './components/AnalysisResult.css'

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setError(null);
    setIsAnalyzing(true);
    
    try {
      // Base64-String ohne "data:image/jpeg;base64," Präfix extrahieren
      const base64Data = imageSrc.split(',')[1];
      const analysisResult = await OpenAIService.analyzeIngredients(base64Data);
      setAnalysis(analysisResult);
    } catch (err) {
      console.error('Analyse-Fehler:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="app">
      <h1>Ingredient Scanner</h1>
      
      {!capturedImage ? (
        <CameraScanner onCapture={handleCapture} />
      ) : (
        <div className="result-view">
          <h2>Gescannte Zutatenliste</h2>
          <div className="image-preview">
            <img src={capturedImage} alt="Gescannte Zutatenliste" />
          </div>
          
          {isAnalyzing && (
            <div className="analyzing">
              <div className="loading-spinner"></div>
              <p>Analysiere Zutatenliste...</p>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
              <button onClick={handleNewScan} className="new-scan-button">
                🔄 Neuen Scan starten
              </button>
            </div>
          )}
          
          {analysis && !isAnalyzing && (
            <AnalysisResult analysis={analysis} onNewScan={handleNewScan} />
          )}
          
          {!analysis && !isAnalyzing && !error && (
            <div className="result-controls">
              <button onClick={handleNewScan} className="new-scan-button">
                🔄 Neuen Scan starten
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
