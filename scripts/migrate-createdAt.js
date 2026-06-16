const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: String,
  name: String,
  easySpeed: { type: Number, default: 20 },
  denseSpeed: { type: Number, default: 12 },
  hoursPerDay: { type: Number, default: 7 },
  papers: [{ paper: String, color: String, light: String, subjects: [{ name: String, dense: Boolean, books: [{ name: String, pages: Number }] }] }],
  pdfBooks: [{ url: String, name: String, pdfUrl: String, totalPages: Number, pagesRead: { type: Number, default: 0 }, sessions: [{ pagesRead: Number, duration: Number, speed: Number, date: Date }], createdAt: { type: Date, default: Date.now } }],
  isPro: { type: Boolean, default: false },
  subscriptionId: String,
  subscriptionStatus: String,
  subscriptionExpiry: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  newsReadCount: { type: Number, default: 0 },
  newsReadDate: Date
});

const Plan = mongoose.model('Plan', PlanSchema);

async function migrate() {
  try {
    console.log('🚀 Migrating...\n');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not set');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');
    
    const users = await Plan.find({ $or: [{ createdAt: null }, { createdAt: { $exists: false } }] });
    console.log(`Found ${users.length} users without createdAt\n`);
    
    for (const user of users) {
      const createdAtValue = user.updatedAt || new Date();
      await Plan.findByIdAndUpdate(user._id, { createdAt: createdAtValue });
      console.log(`✅ Updated ${user.email}`);
    }
    
    console.log(`\n✨ Migration complete! Updated ${users.length} users`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

migrate();
