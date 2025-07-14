import OpenAI from 'openai';

export interface IngredientAnalysis {
  ingredients: string[];
  allergens: string[];
  nutrition: string;
  summary: string;
}

export class OpenAIService {
  private static apiKey: string | null = null;
  private static readonly STORAGE_KEY = 'ingredient_scanner_api_key';

  /**
   * Lädt den API-Schlüssel aus dem localStorage
   */
  static loadApiKeyFromStorage(): string | null {
    if (this.apiKey) return this.apiKey;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.apiKey = stored;
        return stored;
      }
    } catch (error) {
      console.warn('Fehler beim Laden des API-Schlüssels aus localStorage:', error);
    }
    return null;
  }

  /**
   * Setzt den API-Schlüssel und speichert ihn im localStorage
   */
  static setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    try {
      localStorage.setItem(this.STORAGE_KEY, apiKey);
    } catch (error) {
      console.warn('Fehler beim Speichern des API-Schlüssels in localStorage:', error);
    }
  }

  /**
   * Löscht den API-Schlüssel aus dem localStorage
   */
  static clearApiKey() {
    this.apiKey = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Fehler beim Löschen des API-Schlüssels aus localStorage:', error);
    }
  }

  /**
   * Prüft, ob ein API-Schlüssel gesetzt ist
   */
  static hasApiKey(): boolean {
    if (this.apiKey) return true;
    return this.loadApiKeyFromStorage() !== null;
  }

  /**
   * Gibt den aktuellen API-Schlüssel zurück
   */
  static getApiKey(): string | null {
    return this.apiKey || this.loadApiKeyFromStorage();
  }

  /**
   * Gibt den aktuellen API-Schlüssel zurück (maskiert)
   */
  static getMaskedApiKey(): string {
    const key = this.apiKey || this.loadApiKeyFromStorage();
    if (!key) return '';
    
    // Zeige nur die ersten 7 und letzten 4 Zeichen
    if (key.length <= 11) return '***' + key.slice(-4);
    return key.slice(0, 7) + '***' + key.slice(-4);
  }

  /**
   * Löscht den API-Schlüssel
   */
  static deleteApiKey() {
    this.clearApiKey();
  }

  /**
   * Analysiert ein Bild von Inhaltsstoffen
   */
  static async analyzeIngredients(imageBase64: string): Promise<IngredientAnalysis> {
    // API Key Validierung
    if (!this.apiKey && !this.loadApiKeyFromStorage()) {
      throw new Error('OpenAI API-Schlüssel fehlt. Bitte geben Sie Ihren API-Schlüssel ein.');
    }

    // Bilddaten Validierung
    if (!imageBase64 || imageBase64.length < 100) {
      throw new Error('Ungültiges Bild. Bitte stellen Sie sicher, dass das Bild klar und gut lesbar ist.');
    }

    // OpenAI Client mit aktuellem API-Schlüssel initialisieren
    const openai = new OpenAI({
      apiKey: this.apiKey || this.loadApiKeyFromStorage()!,
      dangerouslyAllowBrowser: true // Für Client-seitige Nutzung
    });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für Lebensmittelanalyse. Deine Aufgabe ist es, ausschließlich die Inhaltsstoffe auf dem Bild zu erkennen und zu extrahieren.

            Antworte im folgenden JSON-Format:
            {
              "ingredients": ["inhaltsstoff 1", "inhaltsstoff 2", ...],
              "allergens": ["allergen 1", "allergen 2", ...],
              "summary": "kurze zusammenfassung der wichtigsten punkte auf englisch"
            }

            Wichtige Regeln:
            - Erkenne und extrahiere alle Inhaltsstoffe so präzise wie möglich
            - Normalisiere alle Bezeichnungen: alles klein geschrieben, keine Umlaute, keine Sonderzeichen, keine Steuerzeichen, keine Kommas, keine doppelten Leerzeichen
            - Bevorzuge chemische Bezeichnungen, falls vorhanden
            - Übersetze alle natürlichsprachlichen Begriffe, die nicht englisch sind, ins Englische
            - Die JSON-Liste ingredients darf nur einzelne, saubere Begriffe enthalten (keine Sätze, keine Kommas, keine Steuerzeichen)
            - Die JSON-Liste allergens enthält nur erkannte Allergene (z.B. gluten, lactose, nuts, soy, egg, etc.), ebenfalls normalisiert und auf englisch
            - Die summary ist eine sehr kurze Zusammenfassung auf englisch
            - Gib ausschließlich das JSON-Objekt als Antwort zurück, ohne weitere Erklärungen oder Text`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysiere diese Inhaltsstoffe und gib mir eine strukturierte Analyse zurück."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Keine Antwort von der KI erhalten. Bitte versuchen Sie es erneut.');
      }

      // Versuche JSON zu parsen
      try {
        const analysis = JSON.parse(content);
        
        // Validierung der Analyse-Struktur
        if (!analysis.ingredients || !Array.isArray(analysis.ingredients)) {
          throw new Error('Ungültige Analyse-Struktur: Inhaltsstoffe fehlen');
        }
        
        return analysis as IngredientAnalysis;
      } catch (parseError) {
        console.warn('JSON-Parsing fehlgeschlagen, verwende Fallback-Parser:', parseError);
        // Fallback: Strukturierte Antwort parsen
        return this.parseStructuredResponse(content);
      }

    } catch (error: any) {
      console.error('Fehler bei der OpenAI-Analyse:', error);
      
      // Spezifische Fehlermeldungen basierend auf dem Fehlertyp
      if (error?.status === 401) {
        throw new Error('Ungültiger API-Schlüssel. Bitte überprüfen Sie Ihren OpenAI API-Schlüssel.');
      } else if (error?.status === 429) {
        throw new Error('API-Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es erneut.');
      } else if (error?.status === 400) {
        throw new Error('Ungültige Anfrage. Das Bild könnte zu groß oder in einem nicht unterstützten Format sein.');
      } else if (error?.status === 500 || error?.status === 502 || error?.status === 503) {
        throw new Error('OpenAI-Server temporär nicht verfügbar. Bitte versuchen Sie es in einigen Minuten erneut.');
      } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
        throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
      } else if (error?.message?.includes('timeout')) {
        throw new Error('Zeitüberschreitung bei der Analyse. Bitte versuchen Sie es erneut.');
      } else {
        throw new Error(`Analyse fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}. Bitte versuchen Sie es erneut.`);
      }
    }
  }

  /**
   * Fallback-Parser für strukturierte Antworten
   */
  private static parseStructuredResponse(content: string): IngredientAnalysis {
    const ingredients: string[] = [];
    const allergens: string[] = [];
    let nutrition = '';
    let summary = '';

    // Einfache Text-Parsing-Logik
    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().includes('zutat')) {
        currentSection = 'ingredients';
      } else if (trimmedLine.toLowerCase().includes('allergen')) {
        currentSection = 'allergens';
      } else if (trimmedLine.toLowerCase().includes('nährwert')) {
        currentSection = 'nutrition';
      } else if (trimmedLine.toLowerCase().includes('zusammenfassung')) {
        currentSection = 'summary';
      } else if (trimmedLine && currentSection) {
        if (currentSection === 'ingredients') {
          ingredients.push(trimmedLine);
        } else if (currentSection === 'allergens') {
          allergens.push(trimmedLine);
        } else if (currentSection === 'nutrition') {
          nutrition = trimmedLine;
        } else if (currentSection === 'summary') {
          summary = trimmedLine;
        }
      }
    }

    // Validierung der geparsten Daten
    if (ingredients.length === 0) {
      throw new Error('Keine Inhaltsstoffe im Bild erkannt. Bitte stellen Sie sicher, dass die Inhaltsstoffe klar sichtbar sind.');
    }

    return {
      ingredients,
      allergens,
      nutrition,
      summary
    };
  }
} 