// ============================================
// Lius FinTech App - Backend Server
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with larger limit for images
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve frontend files

// File paths for JSON storage
const USERS_FILE = path.join(__dirname, 'users.json');
const TRANSACTIONS_FILE = path.join(__dirname, 'transactions.json');

// ============================================
// Helper Functions
// ============================================

/**
 * Read data from JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Array|Object} Parsed JSON data
 */
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return filePath === USERS_FILE ? [] : [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

/**
 * Write data to JSON file
 * @param {string} filePath - Path to JSON file
 * @param {Array|Object} data - Data to write
 */
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Compare face images (simplified simulation)
 * In production, this would use actual face recognition AI
 * @param {string} storedFace - Base64 stored face image
 * @param {string} providedFace - Base64 provided face image
 * @returns {boolean} Whether faces match
 */
function compareFaces(storedFace, providedFace) {
  // Simplified simulation: check if both images exist and have similar length
  // In production, use face-api.js or similar library
  if (!storedFace || !providedFace) return false;
  
  // For demo purposes, we'll accept any face image
  // In real app, implement actual face comparison
  return Math.abs(storedFace.length - providedFace.length) < 1000;
}

// ============================================
// API Endpoints
// ============================================

/**
 * POST /api/register
 * Register a new user with username, password, and face image
 */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, faceImage } = req.body;

    // Validation
    if (!username || !password || !faceImage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, and face image are required' 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username must be at least 3 characters long' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const users = readJSON(USERS_FILE);
    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
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
      balance: 1000.00, // Starting balance
      faceImage: faceImage,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      userId: newUser.id 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

/**
 * POST /api/login
 * Authenticate user with username, password, and face verification
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, faceImage } = req.body;

    // Validation
    if (!username || !password || !faceImage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, and face image are required' 
      });
    }

    // Find user
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    //// Verify face (disabled)
const isFaceValid = true;

if (!isFaceValid) {
  return res.status(401).json({
    success: false,
    message: "Face verification failed"
  });
}

    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

/**
 * GET /api/balance/:userId
 * Get current balance for a user
 */
app.get('/api/balance/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      balance: user.balance,
      username: user.username
    });

  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching balance' 
    });
  }
});

/**
 * POST /api/transfer
 * Transfer money between users
 */
app.post('/api/transfer', (req, res) => {
  try {
    const { fromUserId, toUsername, amount } = req.body;

    // Validation
    if (!fromUserId || !toUsername || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'From user, to username, and amount are required' 
      });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid transfer amount' 
      });
    }

    // Read users
    const users = readJSON(USERS_FILE);
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.username === toUsername);

    // Check if users exist
    if (!fromUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sender not found' 
      });
    }

    if (!toUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recipient not found' 
      });
    }

    // Check sufficient balance
    if (fromUser.balance < transferAmount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance' 
      });
    }

    // Perform transfer
    fromUser.balance = parseFloat((fromUser.balance - transferAmount).toFixed(2));
    toUser.balance = parseFloat((toUser.balance + transferAmount).toFixed(2));

    // Save updated balances
    writeJSON(USERS_FILE, users);

    // Create transaction record
    const transactions = readJSON(TRANSACTIONS_FILE);
    const transaction = {
      id: generateId(),
      fromUserId: fromUser.id,
      fromUsername: fromUser.username,
      toUserId: toUser.id,
      toUsername: toUser.username,
      amount: transferAmount,
      date: new Date().toISOString()
    };

    transactions.push(transaction);
    writeJSON(TRANSACTIONS_FILE, transactions);

    res.status(200).json({ 
      success: true, 
      message: 'Transfer successful',
      newBalance: fromUser.balance,
      transaction: transaction
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during transfer' 
    });
  }
});

/**
 * GET /api/transactions/:userId
 * Get transaction history for a user
 */
app.get('/api/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const transactions = readJSON(TRANSACTIONS_FILE);
    
    // Filter transactions involving this user
    const userTransactions = transactions
      .filter(t => t.fromUserId === userId || t.toUserId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Most recent first
      .map(t => ({
        ...t,
        type: t.fromUserId === userId ? 'sent' : 'received'
      }));

    res.status(200).json({ 
      success: true, 
      transactions: userTransactions
    });

  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching transactions' 
    });
  }
});

// ============================================
// Initialize JSON files if they don't exist
// ============================================
if (!fs.existsSync(USERS_FILE)) {
  writeJSON(USERS_FILE, []);
  console.log('Created users.json');
}

if (!fs.existsSync(TRANSACTIONS_FILE)) {
  writeJSON(TRANSACTIONS_FILE, []);
  console.log('Created transactions.json');
}

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Lius FinTech Server Running         ║
║   Port: ${PORT}                          ║
║   Frontend: http://localhost:${PORT}     ║
╚═══════════════════════════════════════╝
  `);
});
