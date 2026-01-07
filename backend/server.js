require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require('./routes/authRoutes')
const invoiceRoutes = require('./routes/invoiceRoutes')
const aiRoutes = require('./routes/aiRoutes')

const app = express();

// Middleware to handle CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect Database

// Middleware
app.use(express.json());

connectDB();

// Routes Here
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/ai", aiRoutes);

// --- 2. SERVE STATIC FILES ---
const __dirname1 = path.resolve();
const frontendDistPath = path.join(__dirname1, "../frontend/dist");

app.use(express.static(frontendDistPath));

// --- 3. CATCH-ALL ROUTE (Fixed for Express 5) ---
// We use /(.*)/ instead of "*" because newer Express versions don't support "*"
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
