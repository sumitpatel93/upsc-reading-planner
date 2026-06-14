import mongoose, { Schema, model, models } from 'mongoose'

const BookSchema = new Schema({
  id: String,
  name: String,
  pages: Number,
})

const SubjectSchema = new Schema({
  id: String,
  name: String,
  dense: Boolean,
  books: [BookSchema],
})

const PaperSchema = new Schema({
  id: String,
  paper: String,
  color: String,
  light: String,
  subjects: [SubjectSchema],
})

const PlanSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  email: String,
  name: String,
  easySpeed: { type: Number, default: 20 },
  denseSpeed: { type: Number, default: 12 },
  hoursPerDay: { type: Number, default: 7 },
  papers: [PaperSchema],
  updatedAt: { type: Date, default: Date.now },
})

export const Plan = models.Plan || model('Plan', PlanSchema)
