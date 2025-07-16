import { useState, useEffect } from 'react';
import { IngredientListService } from '../services/ingredientLists';
import type { NegativeIngredient } from '../services/ingredientLists';
import './IngredientLists.css';

interface IngredientListsProps {
  isVisible: boolean;
  onClose: () => void;
  initialTab?: 'positive' | 'negative';
}

export default function IngredientLists({ isVisible, onClose, initialTab = 'positive' }: IngredientListsProps) {
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>(initialTab);
  const [positiveList, setPositiveList] = useState<string[]>([]);
  const [negativeList, setNegativeList] = useState<NegativeIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  useEffect(() => {
    if (isVisible) {
      loadLists();
      setActiveTab(initialTab);
    }
  }, [isVisible, initialTab]);

  const loadLists = () => {
    setPositiveList(IngredientListService.getPositiveList());
    setNegativeList(IngredientListService.getNegativeList());
    setSelectedIngredients([]);
    setSearchTerm('');
  };

  const handleIngredientSelect = (ingredient: string) => {
    setSelectedIngredients(prev => 
      prev.includes(ingredient) 
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIngredients.length === 0) return;

    if (activeTab === 'positive') {
      IngredientListService.removeFromPositiveList(selectedIngredients);
      setPositiveList(IngredientListService.getPositiveList());
    } else {
      IngredientListService.removeFromNegativeList(selectedIngredients);
      setNegativeList(IngredientListService.getNegativeList());
    }
    setSelectedIngredients([]);
  };

  const handleDeleteSingle = (ingredient: string) => {
    if (activeTab === 'positive') {
      IngredientListService.removeFromPositiveList([ingredient]);
      setPositiveList(IngredientListService.getPositiveList());
    } else {
      IngredientListService.removeFromNegativeList([ingredient]);
      setNegativeList(IngredientListService.getNegativeList());
    }
  };

  const handleClearAll = () => {
    const listName = activeTab === 'positive' ? 'Verträglichkeitsliste' : 'Unverträglichkeitsliste';
    if (window.confirm(`Möchten Sie wirklich alle Einträge aus der ${listName} löschen?`)) {
      if (activeTab === 'positive') {
        IngredientListService.savePositiveList([]);
        setPositiveList([]);
      } else {
        IngredientListService.saveNegativeList([]);
        setNegativeList([]);
      }
      setSelectedIngredients([]);
    }
  };

  // Sortiere die Negativliste nach Häufigkeit absteigend
  const sortedNegativeList = [...negativeList].sort((a, b) => b.count - a.count);

  const filteredIngredients = (activeTab === 'positive' ? positiveList : sortedNegativeList)
    .filter(ingredient =>
      typeof ingredient === 'string'
        ? ingredient.toLowerCase().includes(searchTerm.toLowerCase())
        : ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getTabIcon = (tab: 'positive' | 'negative') => {
    return tab === 'positive' ? '✅' : '❌';
  };

  const getTabTitle = (tab: 'positive' | 'negative') => {
    return tab === 'positive' ? 'Verträglich' : 'Unverträglich';
  };

  const getTabDescription = (tab: 'positive' | 'negative') => {
    return tab === 'positive' 
      ? 'Inhaltsstoffe, die Sie gut vertragen'
      : 'Inhaltsstoffe, die Sie schlecht vertragen';
  };

  if (!isVisible) return null;

  return (
    <div className="ingredient-lists-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="ingredient-lists-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lists-header">
          <h2>📋 Meine Verträglichkeitslisten</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="lists-tabs">
          <button
            className={`tab-button ${activeTab === 'positive' ? 'active' : ''}`}
            onClick={() => setActiveTab('positive')}
          >
            <span className="tab-icon">{getTabIcon('positive')}</span>
            <span className="tab-text">{getTabTitle('positive')}</span>
            <span className="tab-count">({positiveList.length})</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'negative' ? 'active' : ''}`}
            onClick={() => setActiveTab('negative')}
          >
            <span className="tab-icon">{getTabIcon('negative')}</span>
            <span className="tab-text">{getTabTitle('negative')}</span>
            <span className="tab-count">({negativeList.length})</span>
          </button>
        </div>

        <div className="lists-content">
          <div className="tab-description">
            <p>{getTabDescription(activeTab)}</p>
          </div>

          <div className="search-section">
            <input
              type="text"
              placeholder="Inhaltsstoffe durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="ingredients-section">
            {filteredIngredients.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <p>Keine {activeTab === 'positive' ? 'Verträglichkeits' : 'Unverträglichkeits'}-Einträge vorhanden</p>
                <p className="empty-hint">
                  Scannen Sie Produkte und bewerten Sie Ihre Verträglichkeit, um Listen zu erstellen.
                </p>
              </div>
            ) : (
              <>
                <div className="ingredients-header">
                  <h3>
                    {filteredIngredients.length} von {(activeTab === 'positive' ? positiveList : negativeList).length} Einträgen
                    {searchTerm && ` (gefiltert)`}
                  </h3>
                  {selectedIngredients.length > 0 && (
                    <button onClick={handleDeleteSelected} className="delete-selected-button">
                      🗑️ Ausgewählte löschen ({selectedIngredients.length})
                    </button>
                  )}
                </div>

                <div className="ingredients-list">
                  {filteredIngredients.map((ingredient) => (
                    <div
                      key={typeof ingredient === 'string' ? ingredient : ingredient.name}
                      className={`ingredient-item ${selectedIngredients.includes(typeof ingredient === 'string' ? ingredient : ingredient.name) ? 'selected' : ''}`}
                    >
                      <div className="ingredient-content" onClick={() => handleIngredientSelect(typeof ingredient === 'string' ? ingredient : ingredient.name)}>
                        <input
                          type="checkbox"
                          checked={selectedIngredients.includes(typeof ingredient === 'string' ? ingredient : ingredient.name)}
                          onChange={() => handleIngredientSelect(typeof ingredient === 'string' ? ingredient : ingredient.name)}
                          className="ingredient-checkbox"
                        />
                        <span className="ingredient-name">{typeof ingredient === 'string' ? ingredient : ingredient.name}</span>
                        {activeTab === 'negative' && typeof ingredient !== 'string' && (
                          <span className="ingredient-count">({ingredient.count})</span>
                        )}
                      </div>
                      <button
                        className="delete-single-button"
                        onClick={() => handleDeleteSingle(typeof ingredient === 'string' ? ingredient : ingredient.name)}
                        title={`${typeof ingredient === 'string' ? ingredient : ingredient.name} löschen`}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                <div className="list-actions">
                  <button onClick={handleClearAll} className="clear-all-button">
                    🗑️ Alle löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 