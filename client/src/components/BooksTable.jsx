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

export default function BooksTable({ books, onEditBook, onDeleteBook, sortConfig, onSort }) {
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
      <thead>
        <tr>
          <th>{renderSortButton('Title', 'title')}</th>
          <th>{renderSortButton('Author(s)', 'author')}</th>
          <th>{renderSortButton('Year', 'year')}</th>
          <th>{renderSortButton('Personal Rating', 'rating')}</th>
          <th>{renderSortButton('Community Rating', 'communityRating')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => {
          const personalDisplay =
            formatRatingValue(book.personalRating ?? book.rating) || 'N/A'
          const communityDisplay =
            formatRatingValue(book.communityRating) || 'N/A'
          return (
            <tr key={book.id}>
              <td>
                <span className="book-title-cell">
                  <span className="book-title-text">{book.title}</span>
                  {book.openLibraryWorkKey && (
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
                  )}
                </span>
              </td>
              <td>{book.author}</td>
              <td>{book.year ?? ''}</td>
              <td>{personalDisplay}</td>
              <td>{communityDisplay}</td>
              <td className="table-actions">
                <button className="link-button" onClick={() => onEditBook(book)}>Edit</button>
                <button className="link-button danger" onClick={() => onDeleteBook(book)}>Delete</button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
