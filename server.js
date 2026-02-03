// ============================================
// Lius FinTech App - Backend Server (Face Verification Removed)
// ============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Use Render's dynamic port

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

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// API Endpoints
// ============================================

// ----------- REGISTER -----------
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
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

    const users = readJSON(USERS_FILE);
    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: generateId(),
      username: username,
      password: hashedPassword,
      balance: 1000.00, // Starting balance
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

// ----------- LOGIN -----------
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
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

// ----------- GET BALANCE -----------
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

// ----------- TRANSFER -----------
app.post('/api/transfer', (req, res) => {
  try {
    const { fromUserId, toUsername, amount } = req.body;

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

    const users = readJSON(USERS_FILE);
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.username === toUsername);

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

    if (fromUser.balance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    fromUser.balance = parseFloat((fromUser.balance - transferAmount).toFixed(2));
    toUser.balance = parseFloat((toUser.balance + transferAmount).toFixed(2));

    writeJSON(USERS_FILE, users);

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

// ----------- TRANSACTIONS -----------
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
    const userTransactions = transactions
      .filter(t => t.fromUserId === userId || t.toUserId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
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
if (!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, []);
if (!fs.existsSync(TRANSACTIONS_FILE)) writeJSON(TRANSACTIONS_FILE, []);

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
