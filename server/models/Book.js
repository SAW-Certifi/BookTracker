const { Schema, model } = require('mongoose')

const bookSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  author: { type: String, required: true, trim: true, maxlength: 150 },
  year: Number,
  rating: { type: Number, min: 0, max: 5 },
  communityRating: { type: Number, min: 0, max: 5 },
  openLibraryWorkKey: { type: String, trim: true },
  openLibraryEditionKey: { type: String, trim: true }
}, { timestamps: true })

module.exports = model('Book', bookSchema)
