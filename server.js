// server.js
const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from public directory

// Rate limiting to prevent abuse
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Load schools data from protected directory
let schoolsData = [];

async function loadSchoolsData() {
  try {
    const dataPath = path.join(__dirname, "data", "schools.json");
    const data = await fs.readFile(dataPath, "utf8");
    schoolsData = JSON.parse(data);
    console.log(`Loaded ${schoolsData.length} schools from database`);
  } catch (error) {
    console.error("Error loading schools data:", error);
    process.exit(1);
  }
}

// API Routes
app.get("/api/schools/search", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city || city.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "City parameter is required",
      });
    }

    // Search for schools in the specified city (case-insensitive)
    const filteredSchools = schoolsData.filter((school) =>
      school.city.toLowerCase().includes(city.toLowerCase().trim())
    );

    // Sort by status priority and return top 5
    const statusPriority = {
      Featured: 4,
      Premium: 3,
      Claimed: 2,
      Basic: 1,
    };

    const sortedSchools = filteredSchools
      .sort((a, b) => statusPriority[b.status] - statusPriority[a.status])
      .slice(0, 5);

    res.json({
      success: true,
      schools: sortedSchools,
      total: filteredSchools.length,
      showing: Math.min(filteredSchools.length, 5),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Initialize server
async function startServer() {
  await loadSchoolsData();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(
      `📊 API available at http://localhost:${PORT}/api/schools/search?city=Kuala%20Lumpur`
    );
  });
}

startServer().catch(console.error);
