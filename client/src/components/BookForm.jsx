import { useEffect, useMemo, useRef, useState } from 'react'

const defaultFormValues = {
  title: '',
  author: '',
  year: '',
  personalRating: '',
  communityRating: '',
  openLibraryWorkKey: '',
  openLibraryEditionKey: '',
  note: ''
}

const toFormValues = (book) => ({
  title: book?.title ?? '',
  author: book?.author ?? '',
  year: book?.year === undefined || book?.year === null ? '' : String(book.year),
  personalRating: (() => {
    const source =
      book?.personalRating !== undefined && book?.personalRating !== null
        ? book.personalRating
        : book?.rating
    if (source === undefined || source === null || source === '') return ''
    const numeric = Number(source)
    if (!Number.isFinite(numeric)) return ''
    return String(Math.round(numeric * 100) / 100)
  })(),
  communityRating: (() => {
    if (book?.communityRating === undefined || book?.communityRating === null) return ''
    const numeric = Number(book.communityRating)
    if (!Number.isFinite(numeric)) return ''
    return String(Math.round(numeric * 100) / 100)
  })(),
  openLibraryWorkKey: book?.openLibraryWorkKey ?? '',
  openLibraryEditionKey: book?.openLibraryEditionKey ?? '',
  note: book?.note ?? ''
})

const buildAuthorString = (names = []) => {
  if (!Array.isArray(names) || !names.length) return ''
  const joined = names.filter(Boolean).join(', ')
  return joined.length > 150 ? `${joined.slice(0, 147)}...` : joined
}

const OPEN_LIBRARY_ENDPOINT = 'https://openlibrary.org/search.json'
const SEARCH_FIELDS = 'key,title,author_name,first_publish_year,cover_i,edition_key,cover_edition_key,ratings_average,ratings_sortable,ratings_count,language,edition_count'
const ENGLISH_LANGUAGE_CODES = new Set(['eng'])
const MAX_AUTHOR_LOOKUPS = 3
const NOTE_MAX_LENGTH = 1200
const NOTE_ALLOWED_REGEX = /^[\n\r\t -~]*$/

const resolveOpenLibraryUrl = (workKey = '') => {
  if (!workKey) return null
  if (/^https?:\/\//i.test(workKey)) return workKey
  return `https://openlibrary.org${workKey.startsWith('/') ? workKey : `/works/${workKey}`}`
}

const resolveEditionUrl = (editionKey = '') => {
  if (!editionKey) return null
  if (/^https?:\/\//i.test(editionKey)) return editionKey
  const normalized = editionKey.replace(/\.json$/i, '')
  return `https://openlibrary.org${normalized.startsWith('/books/') ? normalized : `/books/${normalized}`}`
}

const extractEditionKey = (input = '') => {
  if (!input) return ''
  const match = String(input).trim().match(/OL\d+M/i)
  return match ? match[0].toUpperCase() : ''
}

const formatRatingValue = (value) => {
  if (value === undefined || value === null || value === '') return ''
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  const rounded = Math.round(numeric * 10) / 10
  return rounded.toFixed(1).replace(/\.0$/, '')
}

export default function BookForm({ initialBook, onCancel, onSubmit, existingWorkKeys = [] }) {
  const [formValues, setFormValues] = useState({ ...defaultFormValues })
  const [validationErrors, setValidationErrors] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedResultKey, setSelectedResultKey] = useState('')
  const [isResultsVisible, setIsResultsVisible] = useState(false)
  const [manualLinkInput, setManualLinkInput] = useState('')
  const [manualImportError, setManualImportError] = useState('')
  const [isImportingEdition, setIsImportingEdition] = useState(false)
  const searchAreaRef = useRef(null)

  const isEditing = Boolean(initialBook)
  const initialWorkKey = initialBook?.openLibraryWorkKey ?? ''
  const existingWorkKeySet = useMemo(() => {
    const set = new Set(existingWorkKeys || [])
    if (initialWorkKey) set.add(initialWorkKey)
    return set
  }, [existingWorkKeys, initialWorkKey])
  const communityRatingDisplay = formatRatingValue(formValues.communityRating)

  useEffect(() => {
    const nextValues = initialBook ? toFormValues(initialBook) : { ...defaultFormValues }
    setFormValues(nextValues)
    setValidationErrors({})
    setSearchTerm('')
    setSearchResults([])
    setSearchError('')
    setSelectedResultKey(initialBook?.openLibraryWorkKey ?? '')
    setIsResultsVisible(false)
    setManualLinkInput('')
    setManualImportError('')
  }, [initialBook])

  useEffect(() => {
    const handleOutsideInteraction = (event) => {
      if (!searchAreaRef.current) return
      if (!searchAreaRef.current.contains(event.target)) {
        setIsResultsVisible(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideInteraction)
    document.addEventListener('touchstart', handleOutsideInteraction)
    document.addEventListener('focusin', handleOutsideInteraction)
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction)
      document.removeEventListener('touchstart', handleOutsideInteraction)
      document.removeEventListener('focusin', handleOutsideInteraction)
    }
  }, [])

  const hasLinkedWork = Boolean(formValues.openLibraryWorkKey)

  const validateForm = () => {
    const errors = {}
    if (!formValues.title.trim()) {
      errors.title = 'Title is required'
    } else if (formValues.title.length > 150) {
      errors.title = 'Title must be 150 characters or less'
    }
    if (!formValues.author.trim()) {
      errors.author = 'Author is required'
    } else if (formValues.author.length > 150) {
      errors.author = 'Author must be 150 characters or less'
    }
    if (formValues.year !== '') {
      const yearValue = Number(formValues.year)
      if (!Number.isFinite(yearValue) || yearValue < 0 || yearValue > 2025) {
        errors.year = 'Year must be between 0 and 2025'
      }
    }
    if (formValues.personalRating !== '') {
      const ratingValue = Number(formValues.personalRating)
      if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        errors.personalRating = 'Personal rating must be between 0 and 5'
      }
    }
    const rawNote = formValues.note || ''
    const normalizedNote = rawNote.replace(/\r\n/g, '\n')
    const trimmedNote = normalizedNote.trim()
    if (normalizedNote && !NOTE_ALLOWED_REGEX.test(normalizedNote)) {
      errors.note = 'Notes may only use normal charcters.'
    } else if (trimmedNote && trimmedNote.length > NOTE_MAX_LENGTH) {
      errors.note = `Notes must be ${NOTE_MAX_LENGTH} characters or fewer`
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const buildPayload = () => {
    const payload = {
      title: formValues.title.trim(),
      author: formValues.author.trim(),
      year: formValues.year === '' ? undefined : Number(formValues.year),
      personalRating:
        formValues.personalRating === '' ? '' : Number(formValues.personalRating),
      communityRating:
        formValues.communityRating === '' ? '' : Number(formValues.communityRating)
    }
    const workKey = formValues.openLibraryWorkKey.trim()
    const editionKey = formValues.openLibraryEditionKey.trim()
    const normalizedNote = formValues.note.replace(/\r\n/g, '\n')
    const trimmedNote = normalizedNote.trim()
    payload.note = trimmedNote ? trimmedNote : ''

    if (workKey) {
      payload.openLibraryWorkKey = workKey
      if (editionKey) payload.openLibraryEditionKey = editionKey
    } else if (initialBook?.openLibraryWorkKey) {
      payload.openLibraryWorkKey = ''
      if (initialBook?.openLibraryEditionKey) payload.openLibraryEditionKey = ''
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateForm()) return
    await onSubmit(buildPayload())
    if (!initialBook) {
      setFormValues({ ...defaultFormValues })
      setSearchTerm('')
      setSearchResults([])
      setSearchError('')
      setSelectedResultKey('')
      setIsResultsVisible(false)
      setManualLinkInput('')
      setManualImportError('')
    }
  }

  const handleFieldChange = (fieldName) => (event) => {
    const { value } = event.target
    const shouldUnlink =
      (fieldName === 'title' || fieldName === 'author') && Boolean(formValues.openLibraryWorkKey)
    setFormValues((prev) => {
      const next = { ...prev, [fieldName]: value }
      if (shouldUnlink) {
        next.openLibraryWorkKey = ''
        next.openLibraryEditionKey = ''
        next.communityRating = ''
      }
      return next
    })
    if (shouldUnlink) {
      setSelectedResultKey('')
    }
  }

  const handleCancel = () => {
    setFormValues({ ...defaultFormValues })
    setSearchTerm('')
    setSearchResults([])
    setSearchError('')
    setSelectedResultKey('')
    setIsResultsVisible(false)
    setValidationErrors({})
    setManualLinkInput('')
    setManualImportError('')
    onCancel?.()
  }

  const handleSearchInputChange = (event) => {
    const { value } = event.target
    setSearchTerm(value)
    setIsResultsVisible(false)
    setSearchError('')
    setSelectedResultKey('')
    if (!value.trim()) {
      setSearchResults([])
    }
  }

  const handleManualLinkChange = (event) => {
    setManualLinkInput(event.target.value)
    if (manualImportError) setManualImportError('')
  }

  const handleSearch = async () => {
    const trimmed = searchTerm.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchError('Enter at least two characters to search')
      setIsResultsVisible(false)
      return
    }

    setIsSearching(true)
    setSearchError('')
    setSelectedResultKey('')
    setIsResultsVisible(false)
    try {
      const url = new URL(OPEN_LIBRARY_ENDPOINT)
      url.searchParams.set('q', trimmed)
      url.searchParams.set('limit', '10')
      url.searchParams.set('fields', SEARCH_FIELDS)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error(`Open Library responded with ${response.status}`)
      const data = await response.json()
      const docs = Array.isArray(data?.docs) ? data.docs : []

      const normalized = docs
        .map((doc) => {
          const author = buildAuthorString(doc.author_name)
          const workKey = doc.key || ''
          if (!doc.title || !author || !workKey) return null
          const editionKey = doc.cover_edition_key || (Array.isArray(doc.edition_key) ? doc.edition_key[0] : '')
          const communityRatingValue =
            typeof doc.ratings_average === 'number'
              ? doc.ratings_average
              : typeof doc.ratings_sortable === 'number'
                ? doc.ratings_sortable
                : undefined
          return {
            workKey,
            editionKey,
            title: doc.title,
            author,
            year: doc.first_publish_year ?? '',
            communityRating: communityRatingValue,
            languages: Array.isArray(doc.language) ? doc.language : [],
            editionCount: typeof doc.edition_count === 'number' ? doc.edition_count : 0
          }
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aEnglish = a.languages.some((code) => ENGLISH_LANGUAGE_CODES.has(code)) ? 0 : 1
          const bEnglish = b.languages.some((code) => ENGLISH_LANGUAGE_CODES.has(code)) ? 0 : 1
          if (aEnglish !== bEnglish) return aEnglish - bEnglish
          const lowered = trimmed.toLowerCase()
          const aExact = a.title.toLowerCase() === lowered ? 0 : 1
          const bExact = b.title.toLowerCase() === lowered ? 0 : 1
          if (aExact !== bExact) return aExact - bExact
          const aYear = Number(a.year) || Number.POSITIVE_INFINITY
          const bYear = Number(b.year) || Number.POSITIVE_INFINITY
          if (aYear !== bYear) return aYear - bYear
          return b.editionCount - a.editionCount
        })

      setSearchResults(normalized)
      setIsResultsVisible(Boolean(normalized.length))
      if (!normalized.length) setSearchError('No matches found. Try another search term.')
    } catch (error) {
      console.error('Open Library search failed', error)
      setSearchResults([])
      setSearchError('Could not load search results right now.')
      setIsResultsVisible(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSearch()
    }
  }

  const handleSelectResult = (result) => {
    const communityRatingValue =
      typeof result.communityRating === 'number' && Number.isFinite(result.communityRating)
        ? String(Math.round(result.communityRating * 100) / 100)
        : ''
    setSelectedResultKey(result.workKey)
    setFormValues((prev) => ({
      ...prev,
      title: result.title,
      author: result.author,
      year: result.year ? String(result.year) : '',
      openLibraryWorkKey: result.workKey,
      openLibraryEditionKey: result.editionKey ?? '',
      communityRating: communityRatingValue
    }))
    setIsResultsVisible(false)
  }

  const handleRemoveLink = () => {
    setFormValues((prev) => ({
      ...prev,
      openLibraryWorkKey: '',
      openLibraryEditionKey: '',
      communityRating: ''
    }))
    setSelectedResultKey('')
    setIsResultsVisible(false)
  }

  const fetchAuthorNames = async (authorRefs = []) => {
    if (!Array.isArray(authorRefs) || !authorRefs.length) return []
    const lookups = authorRefs
      .filter((ref) => ref?.key)
      .slice(0, MAX_AUTHOR_LOOKUPS)
      .map(async (ref) => {
        try {
          const response = await fetch(`https://openlibrary.org${ref.key}.json`)
          if (!response.ok) return ''
          const data = await response.json()
          return data?.name || ''
        } catch (error) {
          console.error('Failed to fetch author info', error)
          return ''
        }
      })
    const names = await Promise.all(lookups)
    return names.filter(Boolean)
  }

  const handleImportFromOpenLibrary = async () => {
    const editionKey = extractEditionKey(manualLinkInput)
    if (!editionKey) {
      setManualImportError('Enter a valid Open Library book URL or ID (e.g., OL32482502M).')
      return
    }
    setIsImportingEdition(true)
    setManualImportError('')
    try {
      const response = await fetch(`https://openlibrary.org/books/${editionKey}.json`)
      if (!response.ok) throw new Error(`Edition lookup failed with ${response.status}`)
      const edition = await response.json()
      const workKey = edition?.works?.[0]?.key || ''
      const authorNames = await fetchAuthorNames(edition?.authors)
      const publishDate = edition?.publish_date || ''
      const yearMatch = publishDate.match(/(\d{4})/)
      const yearValue = yearMatch ? yearMatch[1] : ''

      setFormValues((prev) => ({
        ...prev,
        title: edition?.title || prev.title,
        author: authorNames.length ? buildAuthorString(authorNames) : prev.author,
        year: yearValue || prev.year,
        openLibraryWorkKey: workKey || prev.openLibraryWorkKey,
        openLibraryEditionKey: editionKey,
        communityRating: ''
      }))
      setSelectedResultKey(workKey || '')
      setIsResultsVisible(false)
      setManualLinkInput('')
    } catch (error) {
      console.error('Failed to import edition from Open Library', error)
      setManualImportError('Could not import details from that link.')
    } finally {
      setIsImportingEdition(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="book-form" noValidate>
      <div className="form-row" ref={searchAreaRef}>
        <label className="form-label">Find a book {isEditing ? '(optional)' : '*'}</label>
        <div className="book-search-controls">
          <input
            type="text"
            className="form-input"
            placeholder="Search Open Library by title, author, or keywords"
            value={searchTerm}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className="manual-import-section">
          <div className="manual-import-controls">
            <input
              type="text"
              className="form-input manual-import-input"
              placeholder="Paste Open Library book URL or ID (e.g., https://openlibrary.org/books/OL32482502M)"
              value={manualLinkInput}
              onChange={handleManualLinkChange}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleImportFromOpenLibrary}
              disabled={isImportingEdition}
            >
              {isImportingEdition ? 'Importing...' : 'Import from link'}
            </button>
          </div>
          {manualImportError && <p className="form-error">{manualImportError}</p>}
        </div>
        {searchError && <p className="form-error">{searchError}</p>}

        {hasLinkedWork ? (
          <>
            <div className="linked-indicator">
              <span className="linked-indicator__status">Linked to Open Library</span>
              <a
                className="linked-indicator__link"
                href={resolveOpenLibraryUrl(formValues.openLibraryWorkKey)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Open Library
              </a>
              <button type="button" className="linked-indicator__remove" onClick={handleRemoveLink}>
                Remove link
              </button>
            </div>
            <p className="community-rating-hint">
              Community rating: {communityRatingDisplay ? `${communityRatingDisplay} / 5` : 'Not available'}
            </p>
          </>
        ) : (
          <p className="search-hint">Linking to Open Library is optional. You can type a custom title and author.</p>
        )}

        {isResultsVisible && searchResults.length > 0 && (
          <ul className="search-results" role="listbox">
            {searchResults.map((result) => {
              const isSelected = result.workKey === selectedResultKey
              const isExisting = existingWorkKeySet.has(result.workKey)
              const ratingSnippet = formatRatingValue(result.communityRating)
              const descriptionParts = [
                result.author,
                result.year ? `(Year: ${result.year})` : '',
                ratingSnippet ? `(Community: ${ratingSnippet}/5)` : ''
              ].filter(Boolean)
              const description = descriptionParts.join(' | ')
              const openLibraryUrl =
                result.editionKey ? resolveEditionUrl(result.editionKey) : resolveOpenLibraryUrl(result.workKey)
              return (
                <li key={result.workKey}>
                  <div className="search-result-row">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`search-result-button${isSelected ? ' is-selected' : ''}${isExisting ? ' is-existing' : ''}`}
                      onClick={() => handleSelectResult(result)}
                    >
                      <span className="result-title">
                        {result.title}
                        {isExisting && (
                          <span
                            className="result-indicator"
                            aria-label="Already in your library"
                            title="Already in your library"
                            role="img"
                          >
                            (saved)
                          </span>
                        )}
                      </span>
                      <span className="result-meta">{description}</span>
                    </button>
                    {openLibraryUrl && (
                      <a
                        className="result-open-button"
                        href={openLibraryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${result.title} on Open Library`}
                        title="Open on Open Library"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="form-row">
        <label className="form-label">Title *</label>
        <input
          className="form-input"
          value={formValues.title}
          onChange={handleFieldChange('title')}
        />
        {validationErrors.title && <p className="form-error">{validationErrors.title}</p>}
      </div>
      <div className="form-row">
        <label className="form-label">Author *</label>
        <input
          className="form-input"
          value={formValues.author}
          onChange={handleFieldChange('author')}
        />
        {validationErrors.author && <p className="form-error">{validationErrors.author}</p>}
      </div>
      <div className="form-row">
        <label className="form-label">Year</label>
        <input
          type="number"
          className="form-input"
          min="0"
          max="2025"
          value={formValues.year}
          onChange={handleFieldChange('year')}
        />
        {validationErrors.year && <p className="form-error">{validationErrors.year}</p>}
      </div>
      <div className="form-row">
        <label className="form-label">Personal Rating (0-5)</label>
        <input
          type="number"
          className="form-input"
          min="0"
          max="5"
          step="0.1"
          value={formValues.personalRating}
          onChange={handleFieldChange('personalRating')}
        />
        {validationErrors.personalRating && <p className="form-error">{validationErrors.personalRating}</p>}
      </div>
      <div className="form-row">
        <label className="form-label">Community Rating</label>
        <input
          type="text"
          className="form-input"
          value={communityRatingDisplay ? `${communityRatingDisplay} / 5` : 'Not available'}
          readOnly
          disabled
          aria-disabled="true"
        />
      </div>
      <div className="form-row note-input-row">
        <div className="note-input-wrapper">
          <label className="form-label" htmlFor="book-note">Notes</label>
          <textarea
            id="book-note"
            className="form-input note-textarea"
            rows={8}
            maxLength={NOTE_MAX_LENGTH}
            value={formValues.note}
            onChange={handleFieldChange('note')}
            placeholder="Add your thoughts, favorite quotes, or reminders."
          />
          <div className="note-field-meta">
            <span className="note-hint">Plain text only. Use this space for personal notes.</span>
            <span className="note-counter">{formValues.note.length}/{NOTE_MAX_LENGTH}</span>
          </div>
          {validationErrors.note && <p className="form-error">{validationErrors.note}</p>}
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit">
          {initialBook ? 'Save' : 'Create'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
