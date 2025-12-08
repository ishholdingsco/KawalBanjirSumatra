const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { startBNPBSyncScheduler } = require('./scheduler/bnpbSync');
const { startAirtableBNPBSyncScheduler } = require('./scheduler/airtableBnpbSync');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kawal-banjir')
  .then(() => {
    console.log('✅ MongoDB Connected');

    // Start BNPB auto-sync schedulers
    // MongoDB sync (daily at 6 AM)
    startBNPBSyncScheduler();

    // Airtable sync (every 6 hours)
    startAirtableBNPBSyncScheduler();
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/reports', require('./routes/reports'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/flood-data', require('./routes/floodData'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/boundaries', require('./routes/boundaries'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Kawal Banjir Sumatra API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
