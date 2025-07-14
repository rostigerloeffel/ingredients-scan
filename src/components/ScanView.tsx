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

  const handleScan = () => {
    const imageSrc = cameraRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
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