const express = require('express');
const cors = require('cors');
const connectDB = require('./config/dbConnection');
require('dotenv').config(); 

const port = process.env.PORT || 3000;

connectDB();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: false,
}));



app.use(express.json()); 

app.use("/api", require("./routes/userRoutes")); // Importing user routes

app.use("/api/files", require("./routes/fileRoutes")); // Importing file routes

app.use(require("./middleware/errorHandler")); // Importing error handler middleware




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})