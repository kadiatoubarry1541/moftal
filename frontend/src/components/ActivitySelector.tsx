import { useState, useMemo } from 'react'
import { ACTIVITES_PROFESSIONNELLES, CATEGORIES_ACTIVITES } from '../utils/activities'
import { useTraduction } from '../i18n/traduction'

interface ActivitySelectorProps {
  value?: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

export function ActivitySelector({ value, onChange, label, placeholder }: ActivitySelectorProps) {
  const { tr } = useTraduction()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Filtrer les activités selon la recherche et la catégorie
  const filteredActivities = useMemo(() => {
    let activities = ACTIVITES_PROFESSIONNELLES

    // Filtrer par catégorie
    if (selectedCategory) {
      activities = CATEGORIES_ACTIVITES[selectedCategory as keyof typeof CATEGORIES_ACTIVITES] || activities
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      activities = activities.filter(activity =>
        activity.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return activities
  }, [searchTerm, selectedCategory])

  const handleSelect = (activity: string) => {
    onChange(activity)
    setIsOpen(false)
    setSearchTerm('')
    setSelectedCategory('')
  }

  const categories = Object.keys(CATEGORIES_ACTIVITES)

  return (
    <div className="activity-selector">
      <label className="field-label">{label}</label>
      <div className="activity-selector-container">
        <div 
          className="activity-selector-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={value ? 'selected-value' : 'placeholder'}>
            {value || placeholder || tr("Sélectionner une activité...")}
          </span>
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </div>

        {isOpen && (
          <div className="activity-selector-dropdown">
            {/* Barre de recherche */}
            <div className="search-container">
              <input
                type="text"
                placeholder={tr("Rechercher une activité...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                autoFocus
              />
            </div>

            {/* Filtres par catégorie */}
            <div className="category-filters">
              <button
                className={`category-filter ${selectedCategory === '' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('')}
              >
                {tr("Toutes")}
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {tr(category)}
                </button>
              ))}
            </div>

            {/* Liste des activités */}
            <div className="activities-list">
              {filteredActivities.length > 0 ? (
                filteredActivities.map(activity => (
                  <div
                    key={activity}
                    className={`activity-option ${value === activity ? 'selected' : ''}`}
                    onClick={() => handleSelect(activity)}
                  >
                    {activity}
                  </div>
                ))
              ) : (
                <div className="no-results">
                  {tr("Aucune activité trouvée")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}















