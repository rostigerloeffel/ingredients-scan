import OpenAI from 'openai';

// OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Für Client-seitige Nutzung
});

export interface IngredientAnalysis {
  ingredients: string[];
  allergens: string[];
  nutrition: string;
  summary: string;
}

export class OpenAIService {
  
  /**
   * Analysiert ein Bild von einer Zutatenliste
   */
  static async analyzeIngredients(imageBase64: string): Promise<IngredientAnalysis> {
    // API Key Validierung
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API-Schlüssel fehlt. Bitte fügen Sie VITE_OPENAI_API_KEY in Ihre .env-Datei hinzu.');
    }

    // Bilddaten Validierung
    if (!imageBase64 || imageBase64.length < 100) {
      throw new Error('Ungültiges Bild. Bitte stellen Sie sicher, dass das Bild klar und gut lesbar ist.');
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für Lebensmittelanalyse. Analysiere die Zutatenliste im Bild und gib eine strukturierte Antwort zurück.
            
            Antworte im folgenden JSON-Format:
            {
              "ingredients": ["Zutat 1", "Zutat 2", ...],
              "allergens": ["Allergen 1", "Allergen 2", ...],
              "nutrition": "Kurze Nährwertinformationen",
              "summary": "Zusammenfassung der wichtigsten Punkte"
            }
            
            Wichtige Regeln:
            - Erkenne alle Zutaten genau
            - Identifiziere Allergene (Gluten, Laktose, Nüsse, etc.)
            - Gib praktische Nährwertinformationen
            - Fasse die wichtigsten Punkte zusammen`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysiere diese Zutatenliste und gib mir eine strukturierte Analyse zurück."
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
          throw new Error('Ungültige Analyse-Struktur: Zutaten fehlen');
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
        throw new Error('Ungültiger API-Schlüssel. Bitte überprüfen Sie Ihren OpenAI API-Schlüssel in der .env-Datei.');
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
      throw new Error('Keine Zutaten im Bild erkannt. Bitte stellen Sie sicher, dass die Zutatenliste klar sichtbar ist.');
    }

    return {
      ingredients,
      allergens,
      nutrition,
      summary
    };
  }
} 