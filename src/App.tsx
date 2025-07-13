import { useState } from 'react'
import CameraScanner from './components/CameraScanner'
import './App.css'
import './components/CameraScanner.css'

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    console.log('Foto aufgenommen:', imageSrc);
    // Hier können Sie später die Bildverarbeitung implementieren
  };

  const handleNewScan = () => {
    setCapturedImage(null);
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
          <div className="result-controls">
            <button onClick={handleNewScan} className="new-scan-button">
              🔄 Neuen Scan starten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
