const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/dbConnection');
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
    if (!origin) return callback(null, true);
    if (/ngrok(?:-free)?\.dev/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy does not allow access from: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use("/api", require("./routes/userRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));
app.use(require("./middleware/errorHandler"));

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});