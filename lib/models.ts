import mongoose, { Schema, model, models } from 'mongoose'

const BookSchema = new Schema({
  name: String,
  pages: Number,
})

const SubjectSchema = new Schema({
  name: String,
  dense: Boolean,
  books: [BookSchema],
})

const PaperSchema = new Schema({
  paper: String,
  color: String,
  light: String,
  subjects: [SubjectSchema],
})

const PdfBookSchema = new Schema({
  url: String,
  name: String,
  pdfUrl: String,
  totalPages: Number,
  pagesRead: { type: Number, default: 0 },
  sessions: [
    {
      pagesRead: Number,
      duration: Number,
      speed: Number,
      date: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

const PlanSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  email: String,
  name: String,
  easySpeed: { type: Number, default: 20 },
  denseSpeed: { type: Number, default: 12 },
  hoursPerDay: { type: Number, default: 7 },
  papers: [PaperSchema],
  pdfBooks: [PdfBookSchema],
  isPro: { type: Boolean, default: false },
  subscriptionId: String,
  subscriptionStatus: String,
  subscriptionExpiry: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  newsReadCount: { type: Number, default: 0 },
  newsReadDate: { type: Date },
})

const Plan = models.Plan || model('Plan', PlanSchema)

export default Plan
