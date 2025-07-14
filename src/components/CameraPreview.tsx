import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import './CameraPreview.css';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';

interface CameraPreviewProps {
  onCapture: (imageSrc: string) => void;
}

const CAMERA_STORAGE_KEY = 'selected_camera';

const CameraPreview: React.FC<CameraPreviewProps> = ({ onCapture }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const webcamRef = useRef<Webcam>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const cropperRef = useRef<HTMLImageElement>(null);

  // Kameras nach Kamera-Berechtigung abrufen
  React.useEffect(() => {
    const getCameras = async () => {
      try {
        // Erst Kamera-Berechtigung anfordern
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Dann alle Kameras abrufen
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Gefundene Kameras:', videoDevices.length, videoDevices);
        setCameras(videoDevices);
        
        // Prüfe, ob eine Kamera im LocalStorage gespeichert ist
        const storedCamera = localStorage.getItem(CAMERA_STORAGE_KEY);
        if (storedCamera && videoDevices.some(cam => cam.deviceId === storedCamera)) {
          setSelectedCamera(storedCamera);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Kameras:', error);
      }
    };

    getCameras();
  }, []);

  // Foto aufnehmen
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setRawImage(imageSrc);
        setShowCrop(true);
      }
    }
  }, []);

  // Bild zuschneiden und weitergeben
  const handleCropConfirm = () => {
    if (!rawImage || !cropperRef.current) return;
    // @ts-ignore
    const cropped = cropperRef.current.cropper.getCroppedCanvas().toDataURL('image/jpeg', 0.95);
    setShowCrop(false);
    setRawImage(null);
    onCapture(cropped);
  };

  // Kamera wechseln
  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value);
    localStorage.setItem(CAMERA_STORAGE_KEY, event.target.value);
  };

  return (
    <div className="camera-preview">
      {/* Cropping-UI mit react-cropper */}
      {showCrop && rawImage && (
        <div className="cropper-modal">
          <div className="cropper-container">
            <Cropper
              src={rawImage}
              style={{ width: '100%', maxWidth: 500, height: 350 }}
              initialAspectRatio={4/3}
              aspectRatio={4/3}
              guides={true}
              viewMode={1}
              dragMode="move"
              background={false}
              responsive={true}
              autoCropArea={1}
              ref={cropperRef}
            />
            <div className="cropper-controls">
              <button onClick={handleCropConfirm} className="scan-button">Ausschnitt übernehmen</button>
              <button onClick={() => { setShowCrop(false); setRawImage(null); }} className="cancel-button">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
      <div className="camera-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // Rückkamera bevorzugen
          }}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          className="camera-video"
        />
        
        <div className="scan-overlay">
          <div className="scan-window">
            <div className="scan-corners">
              <div className="scan-corner top-left"></div>
              <div className="scan-corner top-right"></div>
              <div className="scan-corner bottom-left"></div>
              <div className="scan-corner bottom-right"></div>
            </div>
          </div>
          <div className="scan-instructions">
            Inhaltsstoffe im Rahmen positionieren
          </div>
        </div>
      </div>

      <div className="camera-controls">
        {/* Kamera-Auswahl */}
        {cameras.length > 1 && (
          <div className="camera-selector">
            <label htmlFor="camera-select">Kamera:</label>
            <select
              id="camera-select"
              value={selectedCamera}
              onChange={handleCameraChange}
              className="camera-select"
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Kamera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Scan-Button */}
        <button onClick={capture} className="scan-button">
          📷 Inhaltsstoffe scannen
        </button>
      </div>
    </div>
  );
};

export default CameraPreview; 