import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';
import './CameraPreview.css';
import { createWorker, PSM } from 'tesseract.js';

interface PrepareViewProps {
  image: string;
  onCropDone: (croppedImage: string) => void;
  onShowLists: () => void;
}

const PrepareView: React.FC<PrepareViewProps> = React.memo(({ image, onCropDone, onShowLists }) => {
  const cropperRef = useRef<any>(null);
  const pendingCropBox = useRef<{ left: number, top: number, width: number, height: number } | null>(null);
  const [cropperReady, setCropperReady] = useState(false);

  // Automatic cropping to INCI block
  useEffect(() => {
    async function detectInciBlock() {
      const psmModes = [
        PSM.SINGLE_BLOCK, // 6
        PSM.AUTO,         // 3
        PSM.SPARSE_TEXT,  // 11
        PSM.SINGLE_LINE,  // 7
        PSM.SINGLE_WORD   // 8
      ];
      const worker = await createWorker();
      await worker.load();
      await worker.reinitialize('eng+deu');
      let blockLines: any[] = [];
      for (const psm of psmModes) {
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
          tessedit_min_conf: '40',
          user_defined_dpi: '1000'
        });
        const { data } = await worker.recognize(image);
        // Find the largest contiguous text block (by number of lines)
        const blocks = (data.blocks || []);
        let largestBlock = null;
        let maxLines = 0;
        for (const block of blocks) {
          const lines = (block as any).lines || [];
          if (lines.length > maxLines) {
            maxLines = lines.length;
            largestBlock = block;
          }
        }
        if (largestBlock && ((largestBlock as any).lines || []).length > 0) {
          blockLines = (largestBlock as any).lines;
          break;
        }
      }
      await worker.terminate();
      if (blockLines.length > 0) {
        // Calculate bounding box
        const minX = Math.min(...blockLines.map(l => l.bbox.x0));
        const minY = Math.min(...blockLines.map(l => l.bbox.y0));
        const maxX = Math.max(...blockLines.map(l => l.bbox.x1));
        const maxY = Math.max(...blockLines.map(l => l.bbox.y1));
        // Store bounding box for later use in ready event
        pendingCropBox.current = {
          left: minX,
          top: minY,
          width: maxX - minX,
          height: maxY - minY
        };
        // If cropper is already ready, set crop box immediately
        if (cropperReady && cropperRef.current?.cropper) {
          cropperRef.current.cropper.setCropBoxData(pendingCropBox.current);
        }
      }
    }
    detectInciBlock();
    return () => { };
  }, [image, cropperReady]);

  // Handler for Cropper's ready event
  const handleCropperReady = useCallback(() => {
    setCropperReady(true);
    if (pendingCropBox.current && cropperRef.current?.cropper) {
      cropperRef.current.cropper.setCropBoxData(pendingCropBox.current);
    }
  }, []);

  const handleCrop = useCallback(() => {
    if (cropperRef.current) {
      // @ts-ignore
      const cropped = cropperRef.current.cropper.getCroppedCanvas().toDataURL('image/jpeg', 0.95);
      onCropDone(cropped);
    }
  }, [cropperRef, onCropDone]);

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '100%', height: '100%', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: 600, maxHeight: '60vh', aspectRatio: '4/3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Cropper
              src={image}
              style={{ width: '100%', height: '100%', maxHeight: '60vh', minHeight: 0, objectFit: 'contain' }}
              guides={true}
              viewMode={1}
              dragMode="move"
              background={false}
              responsive={true}
              autoCropArea={1}
              ref={cropperRef}
              ready={handleCropperReady}
            />
          </div>
        </div>
      }
      bottom={
        <div className="camera-controls">
          <button onClick={handleCrop} className="scan-button">Weiter</button>
        </div>
      }
    />
  );
});

export default PrepareView; 