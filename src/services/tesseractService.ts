import { createWorker, PSM } from 'tesseract.js';
import Fuse from 'fuse.js';
import inciNames from '../inci_names.normalized.json';

let fuseInstance: Fuse<string> | null = null;
function getFuseInstance(): Fuse<string> {
  if (!fuseInstance) {
    fuseInstance = new Fuse(inciNames, {
      includeScore: true,
      threshold: 0.35, // adjust according to desired tolerance
    });
  }
  return fuseInstance;
}

export class TesseractService {
  /**
   * Enhanced image preprocessing for better OCR results
   */
  private static preprocessImage(imageBase64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        //const data = imageData.data;
        // Step 1: Grayscale
        // for (let i = 0; i < data.length; i += 4) {
        //  const avg = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        //  data[i] = data[i+1] = data[i+2] = avg;
        // }
        // No sharpening, only grayscale
        ctx.putImageData(imageData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        if (import.meta.env && import.meta.env.DEV) {
          // Debug Log: Resolution and Base64 Preview
          console.log('[OCR-DEBUG] Preprocess:', {
            width: canvas.width,
            height: canvas.height,
            base64Preview: resultUrl.substring(0, 100) + '...'
          });
        }
        resolve(resultUrl);
      };
      img.src = `data:image/jpeg;base64,${imageBase64}`;
    });
  }

  /**
   * OCR extraction of ingredients (enhanced version)
   */
  static async extractIngredients(
    imageBase64: string,
    onDebugInfo?: (info: { preprocessedUrl: string, languages: string[], psmModes: string[], confidenceThreshold: number, dpi: number, charWhitelist: string, params: Record<string, string> }) => void
  ): Promise<string[]> {
    const preprocessed = await this.preprocessImage(imageBase64);
    if (onDebugInfo) {
      onDebugInfo({
        preprocessedUrl: preprocessed,
        languages: ['eng'],
        psmModes: [
          'SINGLE_BLOCK', 'AUTO', 'SPARSE_TEXT', 'SINGLE_LINE', 'SINGLE_WORD'
        ],
        confidenceThreshold: 60,
        dpi: 1000,
        charWhitelist: '',
        params: {
          'preserve_interword_spaces': '1',
          'tessedit_do_invert': '0',
          'textord_min_linesize': '2.0',
          'textord_old_baselines': '0',
          'textord_min_xheight': '8',
          'textord_heavy_nr': '1',
          'tessedit_ocr_engine_mode': '3',
          'lstm_use_matrix': '1',
          'lstm_choice_mode': '2',
          'user_defined_dpi': '1000'
        }
      });
    }

    // OCR with Tesseract
    const worker = await createWorker();
    await worker.load();
    await worker.reinitialize('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0',
      textord_min_linesize: '2.0',
      textord_old_baselines: '0',
      textord_min_xheight: '8',
      textord_heavy_nr: '1',
      tessedit_ocr_engine_mode: '3',
      lstm_use_matrix: '1',
      lstm_choice_mode: '2',
      user_defined_dpi: '300'
    });
    const { data: { text } } = await worker.recognize(preprocessed);
    await worker.terminate();

    if (!text || text.trim().length === 0) return [];

    // Search for the block that starts with 'ingredients:' or similar
    const lines = text.split(/\r?\n/);
    const headerRegex = /\b(ingredients?|inc|zutaten|bestandteile|composition|composizione|composición|ingrédients|ingrediënten)\b\s*[:：]/i;
    let inciLines: string[] = [];
    let inInciBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!inInciBlock && headerRegex.test(line)) {
        // Start new INCI block after the header (remove header itself)
        const afterHeader = line.replace(headerRegex, '').trim();
        if (afterHeader.length > 0) inciLines.push(afterHeader);
        inInciBlock = true;
        continue;
      }
      if (inInciBlock) {
        // Block end: empty line or line without comma (and not very long)
        if (line === '' || (line.indexOf(',') === -1 && line.length < 20)) break;
        inciLines.push(line);
      }
    }
    // Fallback: as before, longest comma block
    if (inciLines.length === 0) {
      const blocks = text.split(/\n+/);
      let inciBlock = '';
      let maxCommas = 0;
      for (const block of blocks) {
        const commaCount = (block.match(/,/g) || []).length;
        if (commaCount > maxCommas) {
          maxCommas = commaCount;
          inciBlock = block;
        }
      }
      if (!inciBlock && text.includes(',')) {
        inciBlock = text;
      }
      if (!inciBlock) return [];
      inciLines = [inciBlock];
    }
    // Combine lines into a block
    let inciBlock = inciLines.join(' ');
    // Remove everything before the first colon (e.g., "Ingredients:")
    inciBlock = inciBlock.replace(/^.*?:\s*/, '');
    // Split by commas and normalize
    const rawIngredients = inciBlock.split(',').map(s => s.trim()).filter(Boolean);

    // Fuzzy matching against INCI list
    const fuse = getFuseInstance();
    const bestMatches: string[] = [];
    for (const ing of rawIngredients) {
      const result = fuse.search(ing);
      if (result.length > 0) {
        bestMatches.push(result[0].item);
      }
    }
    // Return only unique hits
    return Array.from(new Set(bestMatches));
  }
} 