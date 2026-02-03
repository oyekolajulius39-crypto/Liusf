// ============================================
// Lius FinTech - Dashboard Script
// ============================================

const API_URL = "https://lius-fintech-backend.onrender.com/api";

// Current user data
let currentUser = null;

// ============================================
// Initialization
// ============================================

/**
 * Initialize dashboard when page loads
 */
window.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
        // Redirect to login if not logged in
        window.location.href = 'index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        
        // Update welcome message
        document.getElementById('welcomeUser').textContent = `Welcome, ${currentUser.username}`;
        
        // Load initial data
        await refreshBalance();
        await loadTransactions();
        
    } catch (error) {
        console.error('Initialization error:', error);
        logout();
    }
});

// ============================================
// Balance Management
// ============================================

/**
 * Refresh user balance from server
 */
async function refreshBalance() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/balance/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            // Update balance display
            document.getElementById('balanceAmount').textContent = data.balance.toFixed(2);
            
            // Update current user object
            currentUser.balance = data.balance;
            localStorage.setItem('user', JSON.stringify(currentUser));
        } else {
            console.error('Failed to fetch balance:', data.message);
        }
    } catch (error) {
        console.error('Balance fetch error:', error);
    }
}

// ============================================
// Transfer Functions
// ============================================

/**
 * Handle money transfer
 * @param {Event} event - Form submit event
 */
async function handleTransfer(event) {
    event.preventDefault();
    
    const recipientUsername = document.getElementById('recipientUsername').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const messageEl = document.getElementById('transferMessage');
    const button = document.getElementById('transferButton');
    
    // Validation
    if (!recipientUsername) {
        showMessage('transferMessage', 'Please enter recipient username', 'error');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showMessage('transferMessage', 'Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > currentUser.balance) {
        showMessage('transferMessage', 'Insufficient balance', 'error');
        return;
    }
    
    // Show loading
    showLoading();
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromUserId: currentUser.id,
                toUsername: recipientUsername,
                amount: amount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('transferMessage', `Successfully sent $${amount.toFixed(2)} to ${recipientUsername}`, 'success');
            
            // Reset form
            document.getElementById('transferForm').reset();
            
            // Update balance and transactions
            await refreshBalance();
            await loadTransactions();
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                hideMessage('transferMessage');
            }, 3000);
        } else {
            showMessage('transferMessage', data.message, 'error');
        }
    } catch (error) {
        console.error('Transfer error:', error);
        showMessage('transferMessage', 'Network error. Please try again.', 'error');
    } finally {
        hideLoading();
        button.disabled = false;
    }
}

// ============================================
// Transaction History
// ============================================

/**
 * Load transaction history from server
 */
async function loadTransactions() {
    if (!currentUser) return;
    
    const container = document.getElementById('transactionsContainer');
    
    try {
        const response = await fetch(`${API_URL}/transactions/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.transactions.length === 0) {
                container.innerHTML = `
                    <div class="no-transactions">
                        <p>No transactions yet</p>
                        <p style="margin-top: 10px;">Start by sending money to someone!</p>
                    </div>
                `;
            } else {
                // Display transactions
                container.innerHTML = data.transactions.map(transaction => 
                    createTransactionHTML(transaction)
                ).join('');
            }
        } else {
            container.innerHTML = `
                <div class="no-transactions">
                    <p>Error loading transactions</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Transactions fetch error:', error);
        container.innerHTML = `
            <div class="no-transactions">
                <p>Error loading transactions</p>
            </div>
        `;
    }
}

/**
 * Create HTML for a transaction item
 * @param {Object} transaction - Transaction data
 * @returns {string} HTML string
 */
function createTransactionHTML(transaction) {
    const isSent = transaction.type === 'sent';
    const otherUser = isSent ? transaction.toUsername : transaction.fromUsername;
    const icon = isSent ? '📤' : '📥';
    const typeText = isSent ? 'Sent to' : 'Received from';
    const amountPrefix = isSent ? '-' : '+';
    const date = formatDate(transaction.date);
    
    return `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-type ${transaction.type}">
                    <span>${icon}</span>
                    <span>${typeText} ${otherUser}</span>
                </div>
                <div class="transaction-date">${date}</div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${amountPrefix}$${transaction.amount.toFixed(2)}
            </div>
        </div>
    `;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        });
    }
}

// ============================================
// Authentication
// ============================================

/**
 * Logout user and redirect to login page
 */
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ============================================
// UI Helper Functions
// ============================================

/**
 * Show message to user
 * @param {string} elementId - ID of message element
 * @param {string} message - Message text
 * @param {string} type - 'success' or 'error'
 */
function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;
}

/**
 * Hide message
 * @param {string} elementId - ID of message element
 */
function hideMessage(elementId) {
    const messageEl = document.getElementById(elementId);
    messageEl.className = 'message';
}

/**
 * Show loading overlay
 */
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

// ============================================
// Auto-refresh (Optional)
// ============================================

// Auto-refresh balance and transactions every 30 seconds
setInterval(async () => {
    if (currentUser) {
        await refreshBalance();
        await loadTransactions();
    }
}, 30000);
