import { useState, useEffect } from 'react';
import { IngredientListService } from '../services/ingredientLists';
import './IngredientLists.css';

interface IngredientListsProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function IngredientLists({ isVisible, onClose }: IngredientListsProps) {
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');
  const [positiveList, setPositiveList] = useState<string[]>([]);
  const [negativeList, setNegativeList] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  useEffect(() => {
    if (isVisible) {
      loadLists();
    }
  }, [isVisible]);

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

  const filteredIngredients = (activeTab === 'positive' ? positiveList : negativeList)
    .filter(ingredient => 
      ingredient.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="ingredient-lists-overlay" onClick={onClose}>
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
                  {filteredIngredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className={`ingredient-item ${selectedIngredients.includes(ingredient) ? 'selected' : ''}`}
                    >
                      <div className="ingredient-content" onClick={() => handleIngredientSelect(ingredient)}>
                        <input
                          type="checkbox"
                          checked={selectedIngredients.includes(ingredient)}
                          onChange={() => handleIngredientSelect(ingredient)}
                          className="ingredient-checkbox"
                        />
                        <span className="ingredient-name">{ingredient}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSingle(ingredient)}
                        className="delete-single-button"
                        title={`${ingredient} löschen`}
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