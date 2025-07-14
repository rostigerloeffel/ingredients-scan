import { useRef, useImperativeHandle, forwardRef } from 'react';
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
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
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
    </div>
  );
});

export default CameraPreview; 