export default function BooksTable({ books, onEditBook, onDeleteBook, sortConfig, onSort }) {
  const handleSortRequest = (field) => {
    if (typeof onSort === 'function') onSort(field)
  }

  const renderSortButton = (label, field) => {
    const isActive = sortConfig?.field === field
    const nextDirection = isActive && sortConfig.direction === 'asc' ? 'descending' : 'ascending'

    return (
      <button
        type="button"
        className={`sort-button${isActive ? ' is-active' : ''}`}
        onClick={() => handleSortRequest(field)}
        aria-label={`Sort by ${label.toLowerCase()} ${nextDirection}`}
      >
        <span>{label}</span>
        {isActive && (
          <span className="sort-indicator" aria-hidden="true">
            {sortConfig.direction === 'asc' ? 'ASC' : 'DESC'}
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
          <th>Title</th>
          <th>Author</th>
          <th>{renderSortButton('Year', 'year')}</th>
          <th>{renderSortButton('Rating', 'rating')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.id}>
            <td>{book.title}</td>
            <td>{book.author}</td>
            <td>{book.year ?? ''}</td>
            <td>{book.rating ?? ''}</td>
            <td className="table-actions">
              <button className="link-button" onClick={() => onEditBook(book)}>Edit</button>
              <button className="link-button danger" onClick={() => onDeleteBook(book)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
