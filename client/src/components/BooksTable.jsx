const resolveOpenLibraryUrl = (workKey = '') => {
  if (!workKey) return null
  if (/^https?:\/\//i.test(workKey)) return workKey
  return `https://openlibrary.org${workKey.startsWith('/') ? workKey : `/works/${workKey}`}`
}

const formatRatingValue = (value) => {
  if (value === undefined || value === null || value === '') return ''
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  const rounded = Math.round(numeric * 10) / 10
  const formatted = rounded.toFixed(1)
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
}

export default function BooksTable({ books, onEditBook, onDeleteBook, onEditNote, sortConfig, onSort }) {
  const handleSortRequest = (field) => {
    if (typeof onSort === 'function') onSort(field)
  }

  const renderSortButton = (label, field) => {
    const isActive = sortConfig?.field === field
    const isAscending = isActive && sortConfig.direction === 'asc'
    const isDescending = isActive && sortConfig.direction === 'desc'

    let ariaLabel
    if (!isActive) {
      ariaLabel = `Sort by ${label.toLowerCase()} ascending`
    } else if (isAscending) {
      ariaLabel = `Sort by ${label.toLowerCase()} descending`
    } else if (isDescending) {
      ariaLabel = `Clear sorting for ${label.toLowerCase()}`
    } else {
      ariaLabel = `Sort by ${label.toLowerCase()} ascending`
    }

    return (
      <button
        type="button"
        className={`sort-button${isActive ? ' is-active' : ''}`}
        onClick={() => handleSortRequest(field)}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        {isActive && (
          <span className="sort-indicator" aria-hidden="true">
            {isAscending ? '▲' : isDescending ? '▼' : ''}
          </span>
        )}
      </button>
    )
  }

  if (!books.length) return <p className="muted-text">No books found.</p>
  return (
    <table className="data-table">
      <colgroup>
        <col className="table-col-title" />
        <col className="table-col-author" />
        <col className="table-col-year" />
        <col className="table-col-rating" />
        <col className="table-col-rating" />
        <col className="table-col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th className="table-col-title">{renderSortButton('Title', 'title')}</th>
          <th className="table-col-author">{renderSortButton('Author(s)', 'author')}</th>
          <th className="table-col-year">{renderSortButton('Year', 'year')}</th>
          <th className="table-col-rating">{renderSortButton('Personal Rating', 'rating')}</th>
          <th className="table-col-rating">{renderSortButton('Community Rating', 'communityRating')}</th>
          <th className="table-col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => {
          const personalDisplay =
            formatRatingValue(book.personalRating ?? book.rating) || 'N/A'
          const communityDisplay =
            formatRatingValue(book.communityRating) || 'N/A'
          const yearDisplay = book.year ? book.year : 'N/A'
          return (
            <tr key={book.id}>
              <td className="table-col-title">
                <span className="book-title-cell">
                  <span className="book-source-wrapper">
                    {book.openLibraryWorkKey ? (
                      <a
                        className="book-source-indicator"
                        href={resolveOpenLibraryUrl(book.openLibraryWorkKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View this book on Open Library"
                        title="View this book on Open Library"
                      >
                        ↗
                      </a>
                    ) : (
                      <span className="book-source-indicator is-placeholder" aria-hidden="true">↗</span>
                    )}
                  </span>
                  <span className="book-note-wrapper">
                    {book.note ? (
                      <span className="book-note-indicator" aria-label="Contains notes" title="Contains notes">📝</span>
                    ) : (
                      <span className="book-note-indicator is-placeholder" aria-hidden="true">📝</span>
                    )}
                  </span>
                  <span className="book-title-text">{book.title}</span>
                </span>
              </td>
              <td className="table-col-author">
                <span className="table-cell-text">{book.author}</span>
              </td>
              <td className="table-col-year">
                <span className="table-cell-text">{yearDisplay}</span>
              </td>
              <td className="table-col-rating">
                <span className="table-cell-text">{personalDisplay}</span>
              </td>
              <td className="table-col-rating">
                <span className="table-cell-text">{communityDisplay}</span>
              </td>
              <td className="table-actions table-col-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Edit ${book.title}`}
                  onClick={() => onEditBook(book)}
                >
                  ✏️
                </button>
                <button
                  className={`icon-button note-button${book.note ? ' has-note' : ''}`}
                  type="button"
                  aria-label={book.note ? `View or edit notes for ${book.title}` : `Add notes for ${book.title}`}
                  onClick={() => onEditNote?.(book)}
                >
                  📓
                </button>
                <button
                  className="icon-button danger"
                  type="button"
                  aria-label={`Delete ${book.title}`}
                  onClick={() => onDeleteBook(book)}
                >
                  ✕
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
