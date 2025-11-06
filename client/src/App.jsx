import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api'
import './App.css'
import BookForm from './components/BookForm'
import BooksTable from './components/BooksTable'

const DEFAULT_PAGE_SIZE = 5

const normalizeBook = (book) => {
  const { _id: id, ...rest } = book
  return { id, ...rest }
}

export default function App() {
  const [bookList, setBookList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [bookPendingDeletion, setBookPendingDeletion] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [paginationInfo, setPaginationInfo] = useState({ page: 1, totalPages: 1, total: 0 })
  const [recommendations, setRecommendations] = useState([])
  const [recommendationsSource, setRecommendationsSource] = useState('')
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState('')
  const [aiRawOutput, setAiRawOutput] = useState('')
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' })

  const listRef = useRef(null)
  const minHeightRef = useRef(null)
  const pagesCacheRef = useRef({})

  const handleSortToggle = useCallback((field) => {
    setSortConfig((previous) => {
      const isSameField = previous.field === field
      const nextDirection = isSameField && previous.direction === 'asc' ? 'desc' : 'asc'
      return { field, direction: nextDirection }
    })
    pagesCacheRef.current = {}
    setCurrentPage(1)
  }, [])

  const fetchRecommendations = async () => {
    setRecommendationsError('')
    setAiRawOutput('')
    setIsRecommendationsLoading(true)
    try {
      const { data } = await api.get('/api/recommendations')
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations.slice(0, 5) : [])
      setRecommendationsSource(data.source || '')
      setAiRawOutput(data.rawOutput || '')
    } catch (error) {
      const serverMessage = error?.response?.data?.error || 'Could not load recommendations right now.'
      const serverDetails = error?.response?.data?.details
      setRecommendations([])
      setRecommendationsSource('')
      setRecommendationsError(serverDetails ? `${serverMessage} (${serverDetails})` : serverMessage)
      setAiRawOutput(error?.response?.data?.rawOutput || '')
    } finally {
      setIsRecommendationsLoading(false)

    }
  }


  // theme preference memory
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    if (storedTheme === 'dark') setIsDarkMode(true)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode)
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // fetch and cache a page of books
  const fetchAndCache = useCallback(
    async (pageToLoad = 1, { showLoading = true } = {}) => {
      if (pagesCacheRef.current[pageToLoad]) return pagesCacheRef.current[pageToLoad]
      if (showLoading) setIsLoading(true)
      try {
        const params = { page: pageToLoad, limit: pageSize }
        if (searchTerm.trim()) params.search = searchTerm.trim()
        if (ratingFilter !== 'all') params.minRating = ratingFilter
        if (sortConfig.field) {
          params.sortField = sortConfig.field
          params.sortOrder = sortConfig.direction
        }
        const { data } = await api.get('/api/books', { params })
        const books = Array.isArray(data.data) ? data.data : []
        const normalized = books.map(normalizeBook)
        const pagination = data.pagination || { page: 1, totalPages: 1, total: books.length }
        pagesCacheRef.current[pageToLoad] = { books: normalized, pagination }
        if (showLoading) {
          setBookList(normalized)
          setPaginationInfo(pagination)
          setCurrentPage(pagination.page)
          setLoadError('')
        }
        // prefetch next page in the background
        if (pagination.page < pagination.totalPages) {
          fetchAndCache(pagination.page + 1, { showLoading: false }).catch(() => {})
        }
        return pagesCacheRef.current[pageToLoad]
      } catch { // 
        if (showLoading) setLoadError('Failed to load books')
        return null
      } finally {
        if (showLoading) setIsLoading(false)
      }
    },
    [pageSize, ratingFilter, searchTerm, sortConfig.field, sortConfig.direction]
  )

  // load a page with cache if possible
  const loadPage = useCallback(
    async (pageToLoad = 1) => {
      const cached = pagesCacheRef.current[pageToLoad]
      if (cached) {
        setBookList(cached.books)
        setPaginationInfo(cached.pagination)
        setCurrentPage(pageToLoad)
        // make sure next page is prefetched
        if (cached.pagination.page < cached.pagination.totalPages) {
          fetchAndCache(cached.pagination.page + 1, { showLoading: false }).catch(() => {})
        }
        return
      }
      await fetchAndCache(pageToLoad, { showLoading: true })
    },
    [fetchAndCache]
  )

  useEffect(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage])

  useEffect(() => {
    if (isLoading) return
    if (!listRef.current || minHeightRef.current == null) return
    requestAnimationFrame(() => {
      listRef.current.style.minHeight = ''
      minHeightRef.current = null
    })
  }, [isLoading])

  const createBook = async (bookPayload) => {
    try {
      await api.post('/api/books', bookPayload)
      pagesCacheRef.current = {}
      if (currentPage !== 1) setCurrentPage(1)
      else await fetchAndCache(1, { showLoading: true })
      setIsFormOpen(false)
    } catch {
      alert('Create failed')
    }
  }

  const updateBook = async (bookPayload) => {
    if (!selectedBook) return
    try {
      await api.put(`/api/books/${selectedBook.id}`, bookPayload)
      pagesCacheRef.current = {}
      await fetchAndCache(currentPage, { showLoading: true })
      setSelectedBook(null)
      setIsFormOpen(false)
    } catch {
      alert('Update failed')
    }
  }

  const requestDeleteBook = (bookToRemove) => setBookPendingDeletion(bookToRemove)
  const cancelDeleteRequest = () => setBookPendingDeletion(null)

  const confirmDeleteBook = async () => {
    if (!bookPendingDeletion) return
    const bookToRemove = bookPendingDeletion
    try {
      await api.delete(`/api/books/${bookToRemove.id}`)
      pagesCacheRef.current = {}
      await fetchAndCache(currentPage, { showLoading: true })
    } catch {
      alert('Delete failed')
    } finally {
      setBookPendingDeletion(null)
    }
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    pagesCacheRef.current = {}
    setSearchTerm(searchInput.trim())
    setCurrentPage(1)
  }

  const handleRatingFilterChange = (event) => {
    pagesCacheRef.current = {}
    setRatingFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    pagesCacheRef.current = {}
    setSearchInput('')
    setSearchTerm('')
    setRatingFilter('all')
    setSortConfig({ field: null, direction: 'asc' })
    setCurrentPage(1)
  }

  const handlePageSizeChange = (event) => {
    const newSize = Number(event.target.value) || DEFAULT_PAGE_SIZE
    pagesCacheRef.current = {}
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const toggleFormVisibility = () => {
    // simple toggle flip
    setIsFormOpen((previous) => {
      const next = !previous
      if (!next) setSelectedBook(null)
      return next
    })
  }

  const handleFormCancel = () => {
    setSelectedBook(null)
    setIsFormOpen(false)
  }

  const handleEditBook = (book) => {
    // open editor smoothly
    setSelectedBook(book)
    setIsFormOpen(true)
  }

  useEffect(() => {
    if (selectedBook) setIsFormOpen(true)
  }, [selectedBook])

  const formToggleLabel = selectedBook ? 'Close editor' : isFormOpen ? 'Hide form' : 'Add a book'

  // render main layout
  return (
    <div className="app-shell">
      <header className="apph">
        <div className="hmeta">
          <h1 className="app-title">BookTracker</h1>
        </div>
        <button
          className="theme-toggle"
          type="button"
          aria-label="Toggle color theme"
          onClick={() => setIsDarkMode((p) => !p)}
        >
          {isDarkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </header>

      <main className="layout-main">
        <section className="panel panel-list">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Your library</h2>
              <p className="panel-subtitle">Filter by rating or search.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary add-book-toggle"
              aria-expanded={isFormOpen}
              onClick={toggleFormVisibility}
            >
              {formToggleLabel}
            </button>
          </div>
          <div className="list-controls">
            <form className="filter-form" onSubmit={handleSearchSubmit}>
              <div className="filter-field">
                <label className="input-label" htmlFor="search-input">Search</label>
                <input
                  id="search-input"
                  type="text"
                  className="form-input search-input"
                  placeholder="Search by title or author"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label className="input-label" htmlFor="rating-filter">Rating</label>
                <select id="rating-filter" className="form-input filter-select" value={ratingFilter} onChange={handleRatingFilterChange}>
                  <option value="all">All ratings</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                  <option value="1">1+ stars</option>
                </select>
              </div>
              <div className="filter-field">
                <label className="input-label" htmlFor="page-size">Page size</label>
                <select id="page-size" className="form-input filter-select" value={pageSize} onChange={handlePageSizeChange}>
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-primary" type="submit">Search</button>
                <button className="btn btn-secondary" type="button" onClick={handleClearFilters}>Reset</button>
              </div>
            </form>
          </div>

          <div className={`collapsible ${isFormOpen ? 'is-open' : ''}`} aria-hidden={!isFormOpen}>
            <div className="form-surface">
              <h3 className="form-surface-title">{selectedBook ? 'Edit book' : 'Add a book'}</h3>
              <BookForm initialBook={selectedBook} onCancel={handleFormCancel} onSubmit={selectedBook ? updateBook : createBook} />
            </div>
          </div>

          <div ref={listRef} className="panel-list-content">
            {isLoading && <p>Loading...</p>}

            {!isLoading && loadError && <p className="text-error">{loadError}</p>}

            {!isLoading && !loadError && (
            <>
              <div className="table-shell">
                <BooksTable
                  books={bookList}
                  sortConfig={sortConfig}
                  onSort={handleSortToggle}
                  onEditBook={handleEditBook}
                  onDeleteBook={requestDeleteBook}
                />
              </div>
              <div className="pagination-controls">
                {currentPage > 1 && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      if (listRef.current) {
                        minHeightRef.current = listRef.current.offsetHeight
                        listRef.current.style.minHeight = `${minHeightRef.current}px`
                      }
                      setCurrentPage((previous) => Math.max(1, previous - 1))
                    }}
                  >
                    Previous
                  </button>
                )}

                <span className="pagination-info">Page {paginationInfo.page} of {paginationInfo.totalPages}</span>

                {paginationInfo.page < paginationInfo.totalPages && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      if (listRef.current) {
                        minHeightRef.current = listRef.current.offsetHeight
                        listRef.current.style.minHeight = `${minHeightRef.current}px`
                      }
                      setCurrentPage((previous) => previous + 1)
                    }}
                  >
                    Next
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

        <div className="panel">
          <h2 className="panel-title">AI recommendations</h2>
          <p className="panel-description">We analyze your logged books and ratings, then ask our AI to queue up 3-5 fresh reads.</p>

          <div className="recommendations-actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={isRecommendationsLoading}
              onClick={fetchRecommendations}
            >
              {isRecommendationsLoading ? 'Asking AI...' : 'Ask AI for suggestions'}
            </button>

            {recommendationsSource && !recommendationsError && recommendations.length > 0 && (
              <span className="recommendations-source">
                Source: {recommendationsSource.startsWith('ai') ? 'AI model' : recommendationsSource}
              </span>
            )}
          </div>

          {recommendationsError && <p className="text-error">{recommendationsError}</p>}

          {!recommendationsError && !isRecommendationsLoading && recommendations.length === 0 && (
            <p className="muted-text">Click the button to get personalized picks.</p>
          )}

          {recommendations.length > 0 && (
            <ul className="recommendations-list">
              {recommendations.map((item, index) => (
                <li className="recommendation-item" key={`${item.title}-${index}`}>
                  <div className="recommendation-rank">#{index + 1}</div>
                  <div>
                    <p className="recommendation-title">{item.title || 'Untitled'}</p>
                    <p className="recommendation-author">{item.author || 'Unknown author'}</p>
                    {item.reason && <p className="recommendation-reason">{item.reason}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {aiRawOutput && (
            <details className="ai-raw-output">
              <summary>Show raw AI output</summary>
              <pre>{aiRawOutput}</pre>
            </details>
          )}
        </div>
      </main>

      {bookPendingDeletion && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <h3 className="modal-title">Delete Book</h3>
            <p className="modal-message">Are you sure you want to delete "{bookPendingDeletion.title}"?</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelDeleteRequest}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteBook}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
