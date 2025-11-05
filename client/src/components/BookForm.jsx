import { useEffect, useState } from 'react'

const defaultFormValues = {
  title: '',
  author: '',
  year: '',
  rating: ''
}

const toFormValues = (book) => ({
  title: book?.title ?? '',
  author: book?.author ?? '',
  year: book?.year ?? '',
  rating: book?.rating ?? ''
})

export default function BookForm({ initialBook, onCancel, onSubmit }) {
  const [formValues, setFormValues] = useState({ ...defaultFormValues })
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    setFormValues(initialBook ? toFormValues(initialBook) : { ...defaultFormValues })
    setValidationErrors({})
  }, [initialBook])

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
    if (formValues.rating !== '') {
      const ratingValue = Number(formValues.rating)
      if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        errors.rating = 'Rating must be between 0 and 5'
      }
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const buildPayload = () => ({
    title: formValues.title.trim(),
    author: formValues.author.trim(),
    year: formValues.year === '' ? undefined : Number(formValues.year),
    rating: formValues.rating === '' ? undefined : Number(formValues.rating)
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateForm()) return
    await onSubmit(buildPayload())
    if (!initialBook) setFormValues({ ...defaultFormValues })
  }

  const handleFieldChange = (fieldName) => (event) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: event.target.value }))
  }

  const handleCancel = () => {
    setFormValues({ ...defaultFormValues })
    onCancel?.()
  }

  return (
    <form onSubmit={handleSubmit} className="book-form" noValidate>
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
        <label className="form-label">Rating (0–5)</label>
        <input
          type="number"
          className="form-input"
          min="0"
          max="5"
          value={formValues.rating}
          onChange={handleFieldChange('rating')}
        />
        {validationErrors.rating && <p className="form-error">{validationErrors.rating}</p>}
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
