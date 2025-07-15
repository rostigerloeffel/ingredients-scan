export interface IngredientList {
  ingredients: string[];
  lastUpdated: Date;
}

export class IngredientListService {
  private static readonly POSITIVE_LIST_KEY = 'ingredient_scanner_positive_list';
  private static readonly NEGATIVE_LIST_KEY = 'ingredient_scanner_negative_list';

  /**
   * Lädt die Positivliste aus dem localStorage
   */
  static getPositiveList(): string[] {
    try {
      const stored = localStorage.getItem(this.POSITIVE_LIST_KEY);
      if (stored) {
        const data: IngredientList = JSON.parse(stored);
        return data.ingredients || [];
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Positivliste:', error);
    }
    return [];
  }

  /**
   * Lädt die Negativliste aus dem localStorage
   */
  static getNegativeList(): string[] {
    try {
      const stored = localStorage.getItem(this.NEGATIVE_LIST_KEY);
      if (stored) {
        const data: IngredientList = JSON.parse(stored);
        return data.ingredients || [];
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Negativliste:', error);
    }
    return [];
  }

  /**
   * Speichert die Positivliste im localStorage
   */
  static savePositiveList(ingredients: string[]): void {
    try {
      const filtered = ingredients.map(i => i.trim()).filter(i => i.length > 0);
      const data: IngredientList = {
        ingredients: filtered,
        lastUpdated: new Date()
      };
      localStorage.setItem(this.POSITIVE_LIST_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Fehler beim Speichern der Positivliste:', error);
    }
  }

  /**
   * Speichert die Negativliste im localStorage
   */
  static saveNegativeList(ingredients: string[]): void {
    try {
      const filtered = ingredients.map(i => i.trim()).filter(i => i.length > 0);
      const data: IngredientList = {
        ingredients: filtered,
        lastUpdated: new Date()
      };
      localStorage.setItem(this.NEGATIVE_LIST_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Fehler beim Speichern der Negativliste:', error);
    }
  }

  /**
   * Fügt Inhaltsstoffe zur Positivliste hinzu und entfernt sie von der Negativliste
   */
  static addToPositiveList(ingredients: string[]): void {
    const positiveList = this.getPositiveList();
    const negativeList = this.getNegativeList();
    
    // Füge neue Inhaltsstoffe zur Positivliste hinzu
    const updatedPositiveList = [...new Set([...positiveList, ...ingredients])];
    
    // Entferne diese Inhaltsstoffe von der Negativliste
    const updatedNegativeList = negativeList.filter(
      ingredient => !ingredients.includes(ingredient)
    );
    
    this.savePositiveList(updatedPositiveList);
    this.saveNegativeList(updatedNegativeList);
  }

  /**
   * Fügt Inhaltsstoffe zur Negativliste hinzu (nur wenn sie nicht in der Positivliste stehen)
   */
  static addToNegativeList(ingredients: string[]): void {
    const positiveList = this.getPositiveList();
    const negativeList = this.getNegativeList();
    
    // Füge nur Inhaltsstoffe zur Negativliste hinzu, die nicht in der Positivliste stehen
    const ingredientsToAdd = ingredients.filter(
      ingredient => !positiveList.includes(ingredient)
    );
    
    const updatedNegativeList = [...new Set([...negativeList, ...ingredientsToAdd])];
    this.saveNegativeList(updatedNegativeList);
  }

  /**
   * Entfernt Inhaltsstoffe aus der Positivliste
   */
  static removeFromPositiveList(ingredients: string[]): void {
    const positiveList = this.getPositiveList();
    const updatedPositiveList = positiveList.filter(
      ingredient => !ingredients.includes(ingredient)
    );
    this.savePositiveList(updatedPositiveList);
  }

  /**
   * Entfernt Inhaltsstoffe aus der Negativliste
   */
  static removeFromNegativeList(ingredients: string[]): void {
    const negativeList = this.getNegativeList();
    const updatedNegativeList = negativeList.filter(
      ingredient => !ingredients.includes(ingredient)
    );
    this.saveNegativeList(updatedNegativeList);
  }

  /**
   * Löscht alle Listen
   */
  static clearAllLists(): void {
    try {
      localStorage.removeItem(this.POSITIVE_LIST_KEY);
      localStorage.removeItem(this.NEGATIVE_LIST_KEY);
    } catch (error) {
      console.warn('Fehler beim Löschen der Listen:', error);
    }
  }

  /**
   * Prüft, ob ein Inhaltsstoff in der Positivliste steht
   */
  static isInPositiveList(ingredient: string): boolean {
    const positiveList = this.getPositiveList();
    return positiveList.includes(ingredient);
  }

  /**
   * Prüft, ob ein Inhaltsstoff in der Negativliste steht
   */
  static isInNegativeList(ingredient: string): boolean {
    const negativeList = this.getNegativeList();
    return negativeList.includes(ingredient);
  }

  /**
   * Normalisiert Inhaltsstoff-Namen für besseren Vergleich
   */
  static normalizeIngredient(ingredient: string): string {
    return ingredient.toLowerCase().trim();
  }

  /**
   * Normalisiert eine Liste von Inhaltsstoffen
   */
  static normalizeIngredients(ingredients: string[]): string[] {
    return ingredients.map(this.normalizeIngredient);
  }
} 