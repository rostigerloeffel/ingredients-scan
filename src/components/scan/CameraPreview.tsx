import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import './CameraPreview.css';
import '../../styles/cropper.css';

export interface CameraPreviewHandle {
  getScreenshot: () => string | null;
  getFullResScreenshot: () => Promise<string | null>;
}

interface CameraPreviewProps {
  cameraId?: string;
}

const CameraPreviewInner = forwardRef<CameraPreviewHandle, CameraPreviewProps>(({ cameraId }, ref) => {
  const webcamRef = useRef<Webcam>(null);

  const getScreenshot = useCallback(() => {
    if (webcamRef.current) {
      return webcamRef.current.getScreenshot();
    }
    return null;
  }, []);

  const getFullResScreenshot = useCallback(async () => {
    if (webcamRef.current && webcamRef.current.video) {
      const video = webcamRef.current.video as HTMLVideoElement;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', 0.98);
        }
      }
    }
    return null;
  }, []);

  useImperativeHandle(ref, () => ({
    getScreenshot,
    getFullResScreenshot
  }), [getScreenshot, getFullResScreenshot]);

  return (
    <div className="camera-preview">
      <div className="camera-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{
            deviceId: cameraId ? { exact: cameraId } : undefined,
            width: { ideal: 3840, min: 640, max: 4096 },
            height: { ideal: 2160, min: 480, max: 2160 },
            facingMode: 'user'
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

const CameraPreview = React.memo(CameraPreviewInner);

export default CameraPreview; 