import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api'
import './App.css'
import BookForm from './components/BookForm'
import BooksTable from './components/BooksTable'

const normalizeBook = (book) => {
  const { _id: id, ...rest } = book
  return { id, ...rest }
}

export default function App() {
  const [bookList, setBookList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookPendingDeletion, setBookPendingDeletion] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  })

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    if (storedTheme === 'dark') {
      setIsDarkMode(true)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode)
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const fetchBooks = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = { page: currentPage, limit: pageSize }
      if (searchTerm.trim()) params.search = searchTerm.trim()
      if (ratingFilter !== 'all') params.minRating = ratingFilter
      const { data } = await api.get('/api/books', { params })
      const books = Array.isArray(data.data) ? data.data : []
      setBookList(books.map(normalizeBook))
      setPaginationInfo(data.pagination || { page: 1, totalPages: 1, total: books.length })
      setLoadError('')
    } catch {
      setLoadError('Failed to load books')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, ratingFilter, searchTerm])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const createBook = async (bookPayload) => {
    try {
      await api.post('/api/books', bookPayload)
      setCurrentPage(1)
    } catch {
      alert('Create failed')
    }
  }

  const updateBook = async (bookPayload) => {
    if (!selectedBook) return
    try {
      await api.put(`/api/books/${selectedBook.id}`, bookPayload)
      await fetchBooks()
      setSelectedBook(null)
    } catch {
      alert('Update failed')
    }
  }

  const confirmDeleteBook = async () => {
    if (!bookPendingDeletion) return
    try {
      await api.delete(`/api/books/${bookPendingDeletion.id}`)
      await fetchBooks()
    } catch {
      alert('Delete failed')
    } finally {
      setBookPendingDeletion(null)
    }
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchTerm(searchInput.trim())
    setCurrentPage(1)
  }

  const handleRatingFilterChange = (event) => {
    setRatingFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setRatingFilter('all')
    setCurrentPage(1)
  }

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value))
    setCurrentPage(1)
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1 className="app-title">BookTracker</h1>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setIsDarkMode((previous) => !previous)}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="panel">
        <h2 className="panel-title">{selectedBook ? 'Edit Book' : 'Add a Book'}</h2>
        <BookForm
          initialBook={selectedBook}
          onCancel={() => setSelectedBook(null)}
          onSubmit={selectedBook ? updateBook : createBook}
        />
      </div>

      <div className="panel">
        <h2 className="panel-title">Books</h2>
        <div className="list-controls">
          <form className="filter-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by title or author"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <select
              className="form-input filter-select"
              value={ratingFilter}
              onChange={handleRatingFilterChange}
            >
              <option value="all">All ratings</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
              <option value="2">2+ stars</option>
              <option value="1">1+ stars</option>
            </select>
            <button className="btn btn-primary" type="submit">Search</button>
            <button className="btn btn-secondary" type="button" onClick={handleClearFilters}>
              Reset
            </button>
          </form>
        </div>
        {isLoading ? <p>Loading…</p> : loadError ? (
          <p className="text-error">{loadError}</p>
        ) : (
          <>
            <BooksTable
              books={bookList}
              onEditBook={setSelectedBook}
              onDeleteBook={setBookPendingDeletion}
            />
            <div className="pagination-controls">
              <div className="pagination-left">
                <label className="pagination-label">
                  Items per page:
                  <select
                    className="form-input pagination-select"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </label>
              </div>
              <div className="pagination-center">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {paginationInfo.page} of {paginationInfo.totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={paginationInfo.page >= paginationInfo.totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {bookPendingDeletion && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <h3 className="modal-title">Delete Book</h3>
            <p className="modal-message">
              Are you sure you want to delete &quot;{bookPendingDeletion.title}&quot;?
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setBookPendingDeletion(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteBook}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
