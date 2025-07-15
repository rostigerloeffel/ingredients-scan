import { createWorker, PSM } from 'tesseract.js';

export class TesseractService {
  /**
   * Erweiterte Bildvorverarbeitung für bessere OCR-Ergebnisse
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
        const data = imageData.data;
        // Schritt 1: Graustufen
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          data[i] = data[i+1] = data[i+2] = avg;
        }
        // Keine Nachschärfung mehr, nur Graustufen
        ctx.putImageData(imageData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        if (import.meta.env && import.meta.env.DEV) {
          // Debug-Log: Auflösung und Base64-Preview
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
   * OCR-Extraktion von Inhaltsstoffen (erweiterte Version)
   */
  static async extractIngredients(
    imageBase64: string,
    onDebugInfo?: (info: { preprocessedUrl: string, languages: string[], psmModes: string[], confidenceThreshold: number, dpi: number, charWhitelist: string, params: Record<string, string> }) => void
  ): Promise<string[]> {
    const preprocessed = await this.preprocessImage(imageBase64);
    if (onDebugInfo) {
      onDebugInfo({
        preprocessedUrl: preprocessed,
        languages: [
          'deu', 'eng', 'fra', 'spa', 'ita',
          'nld', 'pol', 'rus', 'por', 'tur'
        ],
        psmModes: [
          'SINGLE_BLOCK', 'AUTO', 'SPARSE_TEXT', 'SINGLE_LINE', 'SINGLE_WORD'
        ],
        confidenceThreshold: 60,
        dpi: 300,
        charWhitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,;:.()[]-+/%&@#$',
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
    
    // Erweiterte PSM-Modi für verschiedene Textlayouts
    const psmModes = [
      PSM.SINGLE_BLOCK,    // Einzelner Textblock
      PSM.AUTO,            // Automatische Erkennung
      PSM.SPARSE_TEXT,     // Verstreuter Text
      PSM.SINGLE_LINE,     // Einzelne Zeile
      PSM.SINGLE_WORD      // Einzelne Wörter
    ];
    
    // Erweiterte Sprachunterstützung
    const languages = [
      'deu', 'eng', 'fra', 'spa', 'ita',  // Hauptsprachen
      'nld', 'pol', 'rus', 'por', 'tur'   // Zusätzliche Sprachen
    ];
    
    const ocrResults: string[] = [];
    const confidenceThreshold = 60; // Mindest-Konfidenz
    
    // Führe OCR mit verschiedenen Konfigurationen durch
    for (const psm of psmModes) {
      for (const lang of languages) {
        try {
          const worker = await createWorker();
          await worker.load();
          await worker.reinitialize(lang);
          
          // Erweiterte Tesseract-Parameter
          await worker.setParameters({
            tessedit_pageseg_mode: psm,
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,;:.()[]-+/%&@#$',
            preserve_interword_spaces: '1',
            tessedit_do_invert: '0',           // Keine Invertierung
            textord_min_linesize: '2.0',       // Minimale Zeilengröße
            textord_old_baselines: '0',        // Moderne Baseline-Erkennung
            textord_min_xheight: '8',          // Minimale Zeichenhöhe
            textord_heavy_nr: '1',             // Schwere Rauschreduzierung
            tessedit_ocr_engine_mode: '3',     // LSTM OCR Engine
            lstm_use_matrix: '1',              // LSTM Matrix verwenden
            lstm_choice_mode: '2',             // Erweiterte LSTM-Auswahl
            user_defined_dpi: '300'            // Hohe DPI für bessere Qualität
          });
          
          const { data: { text, confidence } } = await worker.recognize(preprocessed);
          if (import.meta.env && import.meta.env.DEV) {
            console.log('[OCR-DEBUG] Output:', {
              lang, psm, confidence,
              textPreview: text?.substring(0, 300) + (text && text.length > 300 ? '...' : '')
            });
          }
          
          // Nur Ergebnisse mit ausreichender Konfidenz verwenden
          if (text && text.trim().length > 0 && confidence > confidenceThreshold) {
            ocrResults.push(text);
          }
          
          await worker.terminate();
        } catch (error) {
          console.warn(`OCR failed for PSM ${psm}, lang ${lang}:`, error);
        }
      }
    }
    
    // Merge aller OCR-Texte
    const fullText = ocrResults.join('\n');
    
    // Erweiterte Heuristik für Inhaltsstoff-Erkennung
    const lines = fullText.split(/\r?\n/).map(l => l.trim());
    let ingredientLines: string[] = [];
    
    // Erweiterte Schlüsselwörter für verschiedene Sprachen
    const ingredientKeywords = [
      // Deutsch
      'ingredients', 'ingrediencs', 'inc', 'bestandteile', 'bestandteil', 
      'inhaltstoffe', 'inhaltstoffe', 'zutaten', 'zutat', 'zusammensetzung',
      // Englisch
      'ingredients', 'ingrediencs', 'inc', 'contains', 'composition',
      // Französisch
      'composants', 'ingrédients', 'composition', 'contient',
      // Spanisch
      'ingredientes', 'composición', 'contiene',
      // Italienisch
      'ingredienti', 'composizione', 'contiene',
      // Niederländisch
      'bestanddelen', 'ingrediënten', 'samenstelling',
      // Polnisch
      'składniki', 'skład',
      // Russisch
      'ингредиенты', 'состав',
      // Portugiesisch
      'ingredientes', 'composição',
      // Türkisch
      'içindekiler', 'bileşenler'
    ];
    
    // Erweiterte Muster-Erkennung
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Prüfe auf Schlüsselwörter
      if (ingredientKeywords.some(keyword => lowerLine.includes(keyword))) {
        ingredientLines.push(line);
        continue;
      }
      
      // Prüfe auf typische Inhaltsstoff-Muster
      if (this.isIngredientLine(line)) {
        ingredientLines.push(line);
        continue;
      }
      
      // Prüfe auf numerische Listen (1., 2., etc.)
      if (/^\d+\.\s*[a-z]/i.test(line)) {
        ingredientLines.push(line);
        continue;
      }
      
      // Prüfe auf Prozentangaben
      if (/\d+%/.test(line) && /[a-z]/i.test(line)) {
        ingredientLines.push(line);
        continue;
      }
    }
    
    // Fallback: Verwende alle Zeilen mit Trennzeichen oder spezifischen Mustern
    if (ingredientLines.length === 0) {
      ingredientLines = lines.filter(line => 
        line.split(',').length > 2 || 
        line.split(';').length > 2 ||
        line.includes(':') || 
        line.includes('•') ||
        line.includes('–') ||
        line.includes('-') ||
        this.isIngredientLine(line) ||
        /[a-z]{3,}/i.test(line) // Mindestens 3 Buchstaben
      );
    }
    
    // Extrahiere und normalisiere Inhaltsstoffe
    const allIngredients: string[] = [];
    
    for (const line of ingredientLines) {
      const ingredients = this.extractIngredientsFromLine(line);
      allIngredients.push(...ingredients);
    }
    
    // Entferne Duplikate und leere Einträge
    return Array.from(new Set(allIngredients)).filter(ing => ing.length > 2);
  }
  
  /**
   * Hilfsmethode: Prüft ob eine Zeile Inhaltsstoffe enthält
   */
  private static isIngredientLine(line: string): boolean {
    const lowerLine = line.toLowerCase();
    
    // Erweiterte Inhaltsstoff-Muster
    const patterns = [
      // Trennzeichen-Muster
      /[a-z]+\s*,\s*[a-z]+/, // Komma-getrennte Wörter
      /[a-z]+\s*;\s*[a-z]+/, // Semikolon-getrennte Wörter
      /[a-z]+\s*\.\s*[a-z]+/, // Punkt-getrennte Wörter
      /[a-z]+\s*•\s*[a-z]+/, // Bullet-getrennte Wörter
      
      // Chemische Muster
      /\d+%/, // Prozentangaben
      /e\d{3,}/, // E-Nummern
      /[a-z]+ate$/, // -ate Endungen (typisch für Inhaltsstoffe)
      /[a-z]+ol$/, // -ol Endungen
      /[a-z]+ic$/, // -ic Endungen
      /[a-z]+ide$/, // -ide Endungen
      /[a-z]+ene$/, // -ene Endungen
      /[a-z]+one$/, // -one Endungen
      /[a-z]+ose$/, // -ose Endungen (Zucker)
      /[a-z]+in$/, // -in Endungen
      /[a-z]+ium$/, // -ium Endungen
      
      // Spezielle Inhaltsstoff-Muster
      /vitamin\s+[a-z]/, // Vitamine
      /mineral\s+[a-z]/, // Mineralien
      /acid\s+[a-z]/, // Säuren
      /salt\s+[a-z]/, // Salze
      /oil\s+[a-z]/, // Öle
      /extract\s+[a-z]/, // Extrakte
      /powder\s+[a-z]/, // Pulver
      
      // Deutsche Muster
      /säure\s+[a-z]/, // Säuren
      /salz\s+[a-z]/, // Salze
      /öl\s+[a-z]/, // Öle
      /extrakt\s+[a-z]/, // Extrakte
      /pulver\s+[a-z]/, // Pulver
      
      // Französische Muster
      /acide\s+[a-z]/, // Säuren
      /sel\s+[a-z]/, // Salze
      /huile\s+[a-z]/, // Öle
      /extrait\s+[a-z]/, // Extrakte
      /poudre\s+[a-z]/, // Pulver
      
      // Spanische Muster
      /ácido\s+[a-z]/, // Säuren
      /sal\s+[a-z]/, // Salze
      /aceite\s+[a-z]/, // Öle
      /extracto\s+[a-z]/, // Extrakte
      /polvo\s+[a-z]/, // Pulver
      
      // Italienische Muster
      /acido\s+[a-z]/, // Säuren
      /sale\s+[a-z]/, // Salze
      /olio\s+[a-z]/, // Öle
      /estratto\s+[a-z]/, // Extrakte
      /polvere\s+[a-z]/, // Pulver
    ];
    
    return patterns.some(pattern => pattern.test(lowerLine));
  }
  
  /**
   * Hilfsmethode: Extrahiert Inhaltsstoffe aus einer Zeile
   */
  private static extractIngredientsFromLine(line: string): string[] {
    let raw = line;
    
    // Erweiterte Schlüsselwörter für verschiedene Sprachen
    const ingredientKeywords = [
      // Deutsch
      'ingredients', 'ingrediencs', 'inc', 'bestandteile', 'bestandteil', 
      'inhaltstoffe', 'inhaltstoffe', 'zutaten', 'zutat', 'zusammensetzung',
      // Englisch
      'ingredients', 'ingrediencs', 'inc', 'contains', 'composition',
      // Französisch
      'composants', 'ingrédients', 'composition', 'contient',
      // Spanisch
      'ingredientes', 'composición', 'contiene',
      // Italienisch
      'ingredienti', 'composizione', 'contiene',
      // Niederländisch
      'bestanddelen', 'ingrediënten', 'samenstelling',
      // Polnisch
      'składniki', 'skład',
      // Russisch
      'ингредиенты', 'состав',
      // Portugiesisch
      'ingredientes', 'composição',
      // Türkisch
      'içindekiler', 'bileşenler'
    ];
    
    // Entferne Schlüsselwörter am Anfang
    for (const keyword of ingredientKeywords) {
      const regex = new RegExp(`.*${keyword}\\s*:?\\s*`, 'i');
      raw = raw.replace(regex, '');
    }
    
    // Entferne Doppelpunkte, Bullets und andere Trennzeichen am Anfang
    raw = raw.replace(/^[:•\-]\s*/, '');
    
    // Entferne numerische Präfixe (1., 2., etc.)
    raw = raw.replace(/^\d+\.\s*/, '');
    
    // Splitte an verschiedenen Trennzeichen
    const items = raw.split(/[;,.:•\-\n]/).map(s => s.trim());
    
    // Erweiterte Normalisierung und Filterung
    return items
      .map(s => {
        // Entferne unerwünschte Zeichen, aber behalte wichtige chemische Zeichen
        s = s.replace(/[^a-z0-9\s\-()]/gi, '').replace(/\s+/g, ' ').trim();
        
        // Normalisiere zu Kleinbuchstaben, aber behalte wichtige Großbuchstaben für chemische Formeln
        if (/^[A-Z][a-z]+\d*$/.test(s)) {
          // Chemische Elemente wie "Na", "Ca", etc. beibehalten
          return s;
        }
        return s.toLowerCase();
      })
      .filter(s => {
        // Erweiterte Filterung
        return s.length > 2 && 
               !/\d{3,}/.test(s) && // Keine langen Zahlen
               !/^[0-9\s]*$/.test(s) && // Keine reinen Zahlen
               !/^[a-z]\s*$/.test(s) && // Keine einzelnen Buchstaben
               !/^(und|and|et|y|e|oder|or|ou)$/i.test(s); // Keine Konjunktionen
      });
  }
} 