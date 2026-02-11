import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Database & Storage
import { initializeDatabase, testConnection } from './config/database.js';
import { initializeStorage, initializeBuckets } from './config/storage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// 요청 로깅
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'automation-server',
    timestamp: new Date().toISOString()
  });
});

// Initialize database and storage
async function initializeServices() {
  try {
    // Initialize database
    console.log('🔄 Initializing database...');
    initializeDatabase();
    await testConnection();
    console.log('✅ Database connected');

    // Initialize storage
    console.log('🔄 Initializing storage...');
    initializeStorage();
    await initializeBuckets();
    console.log('✅ Storage initialized');

    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }
}

// Initialize services and start server
await initializeServices();

// Dynamic import routes AFTER services initialization
const routes = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/collect.js'),
  import('./routes/review.js'),
  import('./routes/admin.js'),
]);

// Routes
app.use('/api/auth', routes[0].default);
app.use('/api/collect', routes[1].default);
app.use('/api/review', routes[2].default);
app.use('/api', routes[2].default); // public reviews API
app.use('/api/admin', routes[3].default);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Automation Server running on port ${PORT}`);
  console.log(`📅 Time: ${new Date().toISOString()}`);

  // Initialize cron jobs
  const { initCronJobs } = await import('./cron/scheduler.js');
  initCronJobs();
  console.log('✅ Cron jobs initialized');
});

export default app;
