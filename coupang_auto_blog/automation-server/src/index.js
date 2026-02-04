import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Firebase
import { initializeFirebase } from './config/firebase.js';

// Routes
import collectRoutes from './routes/collect.js';
import reviewRoutes from './routes/review.js';
import adminRoutes from './routes/admin.js';

// Cron jobs
import { initCronJobs } from './cron/scheduler.js';

dotenv.config();

// Initialize Firebase
initializeFirebase();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'automation-server',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/collect', collectRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Automation Server running on port ${PORT}`);
  console.log(`📅 Time: ${new Date().toISOString()}`);

  // Initialize cron jobs
  initCronJobs();
  console.log('✅ Cron jobs initialized');
});

export default app;
