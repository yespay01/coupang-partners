import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Database & Storage
import { initializeDatabase, testConnection, initializeSchema } from './config/database.js';
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

    // Run schema migrations
    await initializeSchema();
    console.log('✅ Database schema initialized');

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

// Public tracking endpoint (인증 불필요 - 서비스 초기화 후, 라우트 등록 전)
app.post('/api/track', async (req, res) => {
  try {
    const {
      page_type, page_slug, page_url, referrer, referrer_domain,
      keyword, utm_source, utm_medium, utm_campaign, ip_address, device_type,
    } = req.body;

    // Bot 필터링
    const userAgent = req.headers['user-agent'] || '';
    if (/bot|crawler|spider|crawling/i.test(userAgent)) {
      return res.json({ success: true, tracked: false });
    }

    // 자체 방문 필터링
    const ip = ip_address || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return res.json({ success: true, tracked: false });
    }

    const { getDb } = await import('./config/database.js');
    const db = getDb();
    await db.query(
      `INSERT INTO visitor_logs
        (page_type, page_slug, page_url, referrer, referrer_domain, keyword,
         utm_source, utm_medium, utm_campaign, ip_address, device_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [page_type, page_slug, page_url, referrer, referrer_domain, keyword,
       utm_source, utm_medium, utm_campaign, ip || null, device_type]
    );

    res.json({ success: true, tracked: true });
  } catch (error) {
    console.error('Tracking error:', error);
    res.json({ success: false });
  }
});

// Dynamic import routes AFTER services initialization
const routes = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/collect.js'),
  import('./routes/review.js'),
  import('./routes/admin.js'),
  import('./routes/recipe.js'),
  import('./routes/news.js'),
  import('./routes/search.js'),
]);

// Routes
app.use('/api/auth', routes[0].default);
app.use('/api/collect', routes[1].default);
app.use('/api/review', routes[2].default);
app.use('/api', routes[2].default); // public reviews API
app.use('/api/admin', routes[3].default);
app.use('/api', routes[4].default); // public recipes API
app.use('/api', routes[5].default); // public news API
app.use('/api', routes[6].default); // public search API

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
  await initCronJobs();
  console.log('✅ Cron jobs initialized');
});

export default app;
