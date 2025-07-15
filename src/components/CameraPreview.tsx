import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import './CameraPreview.css';
import '../styles/cropper.css';

export interface CameraPreviewHandle {
  getScreenshot: () => string | null;
}

interface CameraPreviewProps {
  cameraId?: string;
}

const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(({ cameraId }, ref) => {
  const webcamRef = useRef<Webcam>(null);

  // Optimierte Kamera-Einstellungen für bessere Qualität
  useEffect(() => {
    const optimizeCameraSettings = async () => {
      if (webcamRef.current && webcamRef.current.video) {
        const video = webcamRef.current.video;
        
        // Warten bis das Video geladen ist
        if (video.readyState >= 2) {
          try {
            const stream = video.srcObject as MediaStream;
            if (stream) {
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                // Versuche höhere Auflösung zu setzen
                await videoTrack.applyConstraints({
                  width: { ideal: 1920, min: 1280 },
                  height: { ideal: 1080, min: 720 }
                });
              }
            }
          } catch (error) {
            console.log('Kamera-Optimierung nicht verfügbar:', error);
          }
        }
      }
    };

    // Verzögerung um sicherzustellen, dass die Kamera vollständig geladen ist
    const timer = setTimeout(optimizeCameraSettings, 1000);
    return () => clearTimeout(timer);
  }, [cameraId]);

  useImperativeHandle(ref, () => ({
    getScreenshot: () => {
      if (webcamRef.current) {
        return webcamRef.current.getScreenshot();
      }
      return null;
    }
  }));

  return (
    <div className="camera-preview">
      <div className="camera-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{
            deviceId: cameraId ? { exact: cameraId } : undefined,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: 'environment'
          }}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.9}
          className="camera-video"
        />
        <div className="scan-overlay">
          <div className="scan-window"></div>
          <div className="scan-instructions">
            Inhaltsstoffe im Rahmen positionieren
          </div>
        </div>
      </div>
    </div>
  );
});

export default CameraPreview; 