import React, { useRef } from 'react';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';
import './CameraPreview.css';

interface PrepareViewProps {
  image: string;
  onCropDone: (croppedImage: string) => void;
  onShowLists: () => void;
}

const PrepareView: React.FC<PrepareViewProps> = ({ image, onCropDone, onShowLists }) => {
  const cropperRef = useRef<HTMLImageElement>(null);

  const handleCrop = () => {
    if (cropperRef.current) {
      // @ts-ignore
      const cropped = cropperRef.current.cropper.getCroppedCanvas().toDataURL('image/jpeg', 0.95);
      onCropDone(cropped);
    }
  };

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={
        <Cropper
          src={image}
          style={{ width: '100%', height: '100%', minHeight: 0 }}
          guides={true}
          viewMode={1}
          dragMode="move"
          background={false}
          responsive={true}
          autoCropArea={1}
          ref={cropperRef}
        />
      }
      bottom={
        <div className="camera-controls">
          <button onClick={handleCrop} className="scan-button">Weiter</button>
        </div>
      }
    />
  );
};

export default PrepareView; 