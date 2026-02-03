// ============================================
// Lius FinTech App - Backend Server (UPDATED)
// Face Verification Disabled Completely
// Render Deployment Fixed
// ============================================

const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// ✅ Render requires this
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ✅ Serve frontend from same folder (since no frontend folder exists)
app.use(express.static(__dirname));

// File paths for JSON storage
const USERS_FILE = path.join(__dirname, "users.json");
const TRANSACTIONS_FILE = path.join(__dirname, "transactions.json");

// ============================================
// Helper Functions
// ============================================

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// API Endpoints
// ============================================

/**
 * POST /api/register
 * Register user with ONLY username + password
 * Face verification removed completely
 */
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters long",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const users = readJSON(USERS_FILE);
    const existingUser = users.find((u) => u.username === username);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      id: generateId(),
      username: username,
      password: hashedPassword,
      balance: 1000.0,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: newUser.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

/**
 * POST /api/login
 * Login user with ONLY username + password
 * Face verification removed completely
 */
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Find user
    const users = readJSON(USERS_FILE);
    const user = users.find((u) => u.username === username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ Login Successful
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// ============================================
// Balance Endpoint
// ============================================

app.get("/api/balance/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    const users = readJSON(USERS_FILE);
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      balance: user.balance,
      username: user.username,
    });
  } catch (error) {
    console.error("Balance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching balance",
    });
  }
});

// ============================================
// Initialize JSON files
// ============================================

if (!fs.existsSync(USERS_FILE)) {
  writeJSON(USERS_FILE, []);
  console.log("Created users.json");
}

if (!fs.existsSync(TRANSACTIONS_FILE)) {
  writeJSON(TRANSACTIONS_FILE, []);
  console.log("Created transactions.json");
}

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`✅ Lius FinTech Server Running on Port: ${PORT}`);
});
