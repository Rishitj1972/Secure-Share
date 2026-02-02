const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/dbConnection');
const { runCleanup } = require('./utils/cleanupOrphanedFiles');
require('dotenv').config();

const port = process.env.PORT || 3000;

connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://secure-share-frontend-demo-spc5.vercel.app',
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests without origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Allow all ngrok origins
    if (/ngrok(?:-free)?\.dev/.test(origin)) {
      return callback(null, true);
    }
    
    // Allow localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow specified production origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Reject everything else
    const msg = `CORS policy does not allow access from: ${origin}`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'User-Agent', 'Accept', 'Accept-Language'],
  exposedHeaders: ['Content-Length', 'Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Add ngrok-specific headers
app.use((req, res, next) => {
  res.header('ngrok-skip-browser-warning', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Increase body size limits for chunked uploads (50MB chunks + overhead)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Set server timeout for large file uploads (60 minutes for safety)
server.timeout = 3600000; // 60 minutes
server.keepAliveTimeout = 3610000; // Slightly more than timeout
server.headersTimeout = 3620000; // Extra buffer for headers
app.use("/api", require("./routes/userRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));
app.use(require("./middleware/errorHandler"));

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Run cleanup on server startup
  runCleanup();
  
  // Run cleanup every 6 hours
  setInterval(runCleanup, 6 * 60 * 60 * 1000);
});
