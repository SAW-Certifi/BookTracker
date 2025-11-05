const { Schema, model } = require('mongoose')

const bookSchema = new Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  year: Number,
  rating: { type: Number, min: 0, max: 5 }
}, { timestamps: true })

module.exports = model('Book', bookSchema)
