import { useEffect, useState } from 'react'
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

  const fetchBooks = async () => {
    try {
      setIsLoading(true)
      const { data } = await api.get('/api/books')
      setBookList(data.map(normalizeBook))
      setLoadError('')
    } catch {
      setLoadError('Failed to load books')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const createBook = async (bookPayload) => {
    try {
      const { data } = await api.post('/api/books', bookPayload)
      setBookList((previousBooks) => [normalizeBook(data), ...previousBooks])
    } catch {
      alert('Create failed')
    }
  }

  const updateBook = async (bookPayload) => {
    if (!selectedBook) return
    try {
      const { data } = await api.put(`/api/books/${selectedBook.id}`, bookPayload)
      const updatedBook = normalizeBook(data)
      setBookList((previousBooks) =>
        previousBooks.map((book) => (book.id === updatedBook.id ? updatedBook : book))
      )
      setSelectedBook(null)
    } catch {
      alert('Update failed')
    }
  }

  const requestDeleteBook = (bookToRemove) => {
    setBookPendingDeletion(bookToRemove)
  }

  const cancelDeleteRequest = () => {
    setBookPendingDeletion(null)
  }

  const confirmDeleteBook = async () => {
    if (!bookPendingDeletion) return
    const bookToRemove = bookPendingDeletion
    try {
      await api.delete(`/api/books/${bookToRemove.id}`)
      setBookList((previousBooks) =>
        previousBooks.filter((book) => book.id !== bookToRemove.id)
      )
    } catch {
      alert('Delete failed')
    } finally {
      setBookPendingDeletion(null)
    }
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
        {isLoading ? <p>Loading…</p> : loadError ? (
          <p className="text-error">{loadError}</p>
        ) : (
          <BooksTable
            books={bookList}
            onEditBook={setSelectedBook}
            onDeleteBook={requestDeleteBook}
          />
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
              <button type="button" className="btn btn-secondary" onClick={cancelDeleteRequest}>
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
