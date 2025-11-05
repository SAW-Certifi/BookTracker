export default function BooksTable({ books, onEditBook, onDeleteBook }) {
  if (!books.length) return <p className="muted-text">No books yet. Add one!</p>
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>Year</th>
          <th>Rating</th>
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
