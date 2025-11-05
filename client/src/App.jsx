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

  const deleteBook = async (bookToRemove) => {
    if (!confirm(`Delete "${bookToRemove.title}"?`)) return
    try {
      await api.delete(`/api/books/${bookToRemove.id}`)
      setBookList((previousBooks) =>
        previousBooks.filter((book) => book.id !== bookToRemove.id)
      )
    } catch {
      alert('Delete failed')
    }
  }

  return (
    <div className="app-shell">
      <h1 className="app-title">BookTracker</h1>

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
            onDeleteBook={deleteBook}
          />
        )}
      </div>
    </div>
  )
}
