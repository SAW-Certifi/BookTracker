import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { api, setAuthToken } from './lib/api'
import './App.css'
import { auth } from './lib/firebase'
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
  const [authUser, setAuthUser] = useState(null)
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' })
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isAccountDeleteModalOpen, setIsAccountDeleteModalOpen] = useState(false)

  const listRef = useRef(null)
  const minHeightRef = useRef(null)
  const pagesCacheRef = useRef({})
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setAuthUser(user ? { ...user } : null)
      if (user) {
        try {
          const token = await user.getIdToken()
          setAuthToken(token)
          setVerificationMessage('')
          setAuthError('')
        } catch (error) {
          console.error('Failed to refresh auth token:', error)
        }
      } else {
        setAuthToken(null)
        pagesCacheRef.current = {}
        setBookList([])
        setPaginationInfo({ page: 1, totalPages: 1, total: 0 })
        setSelectedBook(null)
        setIsFormOpen(false)
        setBookPendingDeletion(null)
        setRecommendations([])
        setRecommendationsSource('')
        setRecommendationsError('')
        setAiRawOutput('')
        setIsLoading(false)
      }
      setIsSendingVerification(false)
      setIsRefreshingVerification(false)
      setIsDeletingAccount(false)
      setIsAuthReady(true)
    })
    return unsubscribe
  }, [])

  const fetchRecommendations = async () => {
    if (!authUser || !authUser.emailVerified) {
      setRecommendationsError(authUser ? 'Verify your email to request recommendations.' : 'Sign in to request recommendations.')
      return
    }
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

  useEffect(() => {
    pagesCacheRef.current = {}
    setSearchInput('')
    setSearchTerm('')
    setRatingFilter('all')
    setSelectedBook(null)
    setIsFormOpen(false)
    setBookPendingDeletion(null)
    setRecommendations([])
    setRecommendationsSource('')
    setRecommendationsError('')
    setAiRawOutput('')
    if (authUser?.emailVerified) {
      setSortConfig({ field: null, direction: 'asc' })
      setIsLoading(true)
      setCurrentPage(1)
    } else {
      setBookList([])
      setPaginationInfo({ page: 1, totalPages: 1, total: 0 })
      setIsLoading(false)
      setSortConfig({ field: null, direction: 'asc' })
    }
  }, [authUser])

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
      if (!authUser || !authUser.emailVerified) return null
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
      } catch {
        if (showLoading) setLoadError('Failed to load books')
        return null
      } finally {
        if (showLoading) setIsLoading(false)
      }
    },
    [authUser, pageSize, ratingFilter, searchTerm, sortConfig.field, sortConfig.direction]
  )

  // load a page with cache if possible
  const loadPage = useCallback(
    async (pageToLoad = 1) => {
      if (!authUser || !authUser.emailVerified) return
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
    [authUser, fetchAndCache]
  )

  useEffect(() => {
    if (!authUser || !authUser.emailVerified) return
    loadPage(currentPage)
  }, [authUser, currentPage, loadPage])

  useEffect(() => {
    if (isLoading) return
    if (!listRef.current || minHeightRef.current == null) return
    requestAnimationFrame(() => {
      listRef.current.style.minHeight = ''
      minHeightRef.current = null
    })
  }, [isLoading])

  const createBook = async (bookPayload) => {
    if (!authUser) return
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
    if (!authUser || !selectedBook) return
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
    if (!authUser || !bookPendingDeletion) return
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

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    setVerificationMessage('')
    setIsAuthSubmitting(true)
    try {
      const trimmedEmail = authEmail.trim()
      if (!trimmedEmail) throw new Error('Email is required')
      if (authMode === 'register') {
        const { user } = await createUserWithEmailAndPassword(auth, trimmedEmail, authPassword)
        const displayNameValue = authDisplayName.trim()
        if (displayNameValue) {
          await updateProfile(user, { displayName: displayNameValue })
        }
        await sendEmailVerification(user)
        setVerificationMessage(`Verification link has been sent to ${user.email}. Check your spam.`)
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, authPassword)
      }
    } catch (error) {
      setAuthError(error.message || 'Authentication failed')
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleSendVerification = async () => {
    if (!auth.currentUser) return
    setIsSendingVerification(true)
    setAuthError('')
    try {
      await sendEmailVerification(auth.currentUser)
      setVerificationMessage(`Verification email has been sent to ${auth.currentUser.email}. Check your spam.`)
    } catch (error) {
      setAuthError(error.message || 'Failed to send verification email')
    } finally {
      setIsSendingVerification(false)
    }
  }

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return
    setIsRefreshingVerification(true)
    setAuthError('')
    try {
      await reload(auth.currentUser)
      const updatedUser = auth.currentUser
      if (!updatedUser) throw new Error('User session expired.')
      setAuthUser({ ...updatedUser })
      if (updatedUser.emailVerified) {
        const freshToken = await updatedUser.getIdToken(true)
        setAuthToken(freshToken)
        setVerificationMessage('Email verified!')
      } else {
        setVerificationMessage('Still waiting on verification. Double-check your spam.')
      }
    } catch (error) {
      setAuthError(error.message || 'Failed to refresh your verification status')
    } finally {
      setIsRefreshingVerification(false)
    }
  }

  const openAccountDeleteModal = () => {
    setAuthError('')
    setVerificationMessage('')
    setIsAccountDeleteModalOpen(true)
  }

  const closeAccountDeleteModal = () => {
    if (!isDeletingAccount) setIsAccountDeleteModalOpen(false)
  }

  const handleDeleteAccount = async () => {
    if (!authUser) return
    setAuthError('')
    setIsDeletingAccount(true)
    try {
      await api.delete('/api/account')
      await deleteUser(auth.currentUser)
      setIsAccountDeleteModalOpen(false)
    } catch (error) {
      if (error?.code === 'auth/requires-recent-login') {
        setAuthError('Please sign in again before deleting your account.')
      } else {
        setAuthError(error?.message || 'Failed to delete account')
      }
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const toggleAuthMode = () => {
    setAuthMode((previous) => (previous === 'login' ? 'register' : 'login'))
    setAuthError('')
    setAuthPassword('')
    setAuthDisplayName('')
  }

  const handleSignOut = async () => {
    try {
      setAuthError('')
      setVerificationMessage('')
      await signOut(auth)
    } catch (error) {
      console.error('Sign out failed:', error)
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
  const userDisplayName = authUser?.displayName?.trim() || authUser?.email || 'Reader'

  const handleSortToggle = useCallback((field) => {
    setSortConfig((previous) => {
      const isSameField = previous.field === field
      const nextDirection = isSameField && previous.direction === 'asc' ? 'desc' : 'asc'
      return { field, direction: nextDirection }
    })
    pagesCacheRef.current = {}
    setCurrentPage(1)
  }, [])

  if (!isAuthReady) {
    return (
      <div className="auth-shell">
        <p className="muted-text">Checking session...</p>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="auth-shell">
        <div className="panel auth-panel">
          <h1 className="auth-title">BookTracker</h1>
          <p className="panel-description">Sign in to manage your library.</p>
          {authError && <p className="text-error">{authError}</p>}
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <div className="form-row">
                <label className="form-label" htmlFor="auth-display-name">Display name</label>
                <input
                  id="auth-display-name"
                  className="form-input"
                  value={authDisplayName}
                  onChange={(event) => setAuthDisplayName(event.target.value)}
                  placeholder="What should we call you?"
                />
              </div>
            )}
            <div className="form-row">
              <label className="form-label" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                required
                className="form-input"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="john@doe.com"
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                className="form-input"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={isAuthSubmitting}>
              {isAuthSubmitting ? (authMode === 'register' ? 'Creating account...' : 'Signing in...') : authMode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <button className="auth-mode-toggle" type="button" onClick={toggleAuthMode}>
            {authMode === 'login' ? 'Need an account? Register instead' : 'Have an account? Sign in'}
          </button>
        </div>
        <button
          className="theme-toggle auth-theme-toggle"
          type="button"
          aria-label="Toggle color theme"
          onClick={() => setIsDarkMode((p) => !p)}
        >
          {isDarkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    )
  }

  if (authUser && !authUser.emailVerified) {
    return (
      <div className="auth-shell">
        <div className="panel auth-panel">
          <h1 className="auth-title">Verify your email</h1>
          <p className="panel-description">We sent a confirmation link to <strong>{authUser.email}</strong>. Please verify your email.</p>
          {authError && <p className="text-error">{authError}</p>}
          {verificationMessage && <p className="verification-message">{verificationMessage}</p>}
          <div className="verification-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSendVerification}
              disabled={isSendingVerification}
            >
              {isSendingVerification ? 'Sending...' : 'Resend email'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleRefreshVerification}
              disabled={isRefreshingVerification}
            >
              {isRefreshingVerification ? 'Checking...' : 'I verified my email'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // render main layout
  return (
    <div className="app-shell">
      <header className="apph">
        <div className="hmeta">
          <p className="hwelcome">Welcome back, {userDisplayName}</p>
          <h1 className="app-title">BookTracker</h1>
        </div>
        <div className="actioons">
          <button
            className="theme-toggle"
            type="button"
            aria-label="Toggle color theme"
            onClick={() => setIsDarkMode((p) => !p)}
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="btn btn-secondary signout-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
          <button className="btn btn-danger hdelete" type="button" onClick={openAccountDeleteModal}>
            Delete account
          </button>
        </div>
      </header>

      <main className="layout-main">
        {authError && <p className="text-error auth-inline-error">{authError}</p>}
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
            <p className="muted-text">Click the button to generate personalized book recommendations.</p>
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

      {isAccountDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <h3 className="modal-title">Delete Account</h3>
            <p className="modal-message">This will remove your account delete all saved books. Are you sure?</p>
            {authError && <p className="text-error">{authError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeAccountDeleteModal}
                disabled={isDeletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
