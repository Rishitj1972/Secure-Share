const express = require('express');
const cors = require('cors');
const connectDB = require('./config/dbConnection');
require('dotenv').config(); 

const port = process.env.PORT || 3000;

connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173', // for local dev
  'https://secure-share-frontend-demo-spc5.vercel.app', // deployed frontend
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // needed if sending cookies
}));



app.use(express.json()); 

app.use("/api", require("./routes/userRoutes")); // Importing user routes

app.use("/api/files", require("./routes/fileRoutes")); // Importing file routes

app.use(require("./middleware/errorHandler")); // Importing error handler middleware




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})