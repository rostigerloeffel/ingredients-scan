import React, { useState, useRef } from 'react';
import CameraPreview from './CameraPreview';
import type { CameraPreviewHandle } from './CameraPreview';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';

interface ScanViewProps {
  onCapture: (imageSrc: string) => void;
  onShowLists: () => void;
}

const ScanView: React.FC<ScanViewProps> = ({ onCapture, onShowLists }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const cameraRef = useRef<CameraPreviewHandle>(null);

  React.useEffect(() => {
    const getCameras = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        const storedCamera = localStorage.getItem('selected_camera');
        if (storedCamera && videoDevices.some(cam => cam.deviceId === storedCamera)) {
          setSelectedCamera(storedCamera);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        // Fehler ignorieren
      }
    };
    getCameras();
  }, []);

  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value);
    localStorage.setItem('selected_camera', event.target.value);
  };

  // Cropping-Logik: Schneide Screenshot auf scan-window-Bereich
  const cropToScanWindow = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        // Das Kamera-Video ist 4:3 (width:height), scan-window ist 80% Breite, max 50vh Höhe, mittig
        const videoW = img.width;
        const videoH = img.height;
        // scan-window Werte aus CameraPreview.css:
        // width: 80%, max-height: 50vh, mittig
        const cropW = videoW * 0.8;
        let cropH = videoH * 0.5; // 50% der Höhe
        // Falls das Video nicht hoch genug ist, nimm maximal mögliche Höhe
        if (cropH > videoH) cropH = videoH;
        const cropX = (videoW - cropW) / 2;
        const cropY = (videoH - cropH) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = imageSrc;
    });
  };

  const handleScan = async () => {
    const imageSrc = cameraRef.current?.getScreenshot();
    if (imageSrc) {
      const cropped = await cropToScanWindow(imageSrc);
      onCapture(cropped);
    }
  };

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={<CameraPreview ref={cameraRef} cameraId={selectedCamera} />}
      bottom={
        <div className="camera-controls">
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
          <button onClick={handleScan} className="scan-button">
            📷 Inhaltsstoffe scannen
          </button>
        </div>
      }
    />
  );
};

export default ScanView; 