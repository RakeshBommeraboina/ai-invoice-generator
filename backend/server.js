require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Middleware to handle CORS
// Update "origin" to include your Vercel URL for security
app.use(
  cors({
    origin: [
      "https://ai-invoice-generator-teal.vercel.app", // Your Vercel URL
      "http://localhost:5173" // For local development
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true 
  })
);

// Middleware
app.use(express.json());

// Connect Database
connectDB();

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/ai", aiRoutes);

// --- 404/Home Route Fix ---
// Since we removed the frontend static files, add a simple message for the root URL
// so you don't see "Cannot GET /" when visiting the Render URL.
app.get("/", (req, res) => {
  res.send("Backend is running successfully! Use the frontend on Vercel to access the app.");
});

// REMOVED: All code related to serving "frontend/dist"
// The lines causing the crash have been deleted.

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));