import React, { useCallback, useEffect } from 'react';
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
  const cropperRef = React.useRef<any>(null);

  // Automatic cropping to INCI block
  useEffect(() => {
    let cancelled = false;
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
          tessedit_pageseg_mode: psm
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
      if (blockLines.length > 0 && cropperRef.current) {
        // Calculate bounding box
        const minX = Math.min(...blockLines.map(l => l.bbox.x0));
        const minY = Math.min(...blockLines.map(l => l.bbox.y0));
        const maxX = Math.max(...blockLines.map(l => l.bbox.x1));
        const maxY = Math.max(...blockLines.map(l => l.bbox.y1));
        // Set cropper (timeout to ensure cropper is ready)
        setTimeout(() => {
          if (!cancelled && cropperRef.current?.cropper) {
            cropperRef.current.cropper.setCropBoxData({
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY
            });
          }
        }, 500);
      }
    }
    detectInciBlock();
    return () => { cancelled = true; };
  }, [image]);

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