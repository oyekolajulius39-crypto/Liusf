// ============================================
// Lius FinTech - Dashboard Script (Final Updated)
// ============================================

const API_URL = "https://lius-fintech-backend.onrender.com/api";

// Current user data
let currentUser = null;

// ============================================
// Initialization
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userStr);
        document.getElementById('welcomeUser').textContent = `Welcome, ${currentUser.username}`;
        await refreshBalance();
        await loadTransactions();

        // ===== Password Change Form Listener =====
        const pwdForm = document.getElementById('changePasswordForm');
        if (pwdForm) {
            pwdForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const oldPassword = document.getElementById('oldPassword').value.trim();
                const newPassword = document.getElementById('newPassword').value.trim();
                const messageEl = document.getElementById('passwordMessage');

                if (!oldPassword || !newPassword) {
                    messageEl.textContent = "Please fill in both fields.";
                    messageEl.className = "message error show";
                    return;
                }

                // Call password change function
                changePassword(oldPassword, newPassword);

                // Clear form
                pwdForm.reset();
            });
        }

    } catch (error) {
        console.error('Initialization error:', error);
        logout();
    }
});

// ============================================
// Balance Management
// ============================================

async function refreshBalance() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/balance/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('balanceAmount').textContent = data.balance.toFixed(2);
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

async function handleTransfer(event) {
    event.preventDefault();
    
    const recipientUsername = document.getElementById('recipientUsername').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const messageEl = document.getElementById('transferMessage');
    const button = document.getElementById('transferButton');
    
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
    
    showLoading();
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                fromUserId: currentUser.id,
                toUsername: recipientUsername,
                amount: amount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('transferMessage', `Successfully sent $${amount.toFixed(2)} to ${recipientUsername}`, 'success');
            document.getElementById('transferForm').reset();
            await refreshBalance();
            await loadTransactions();

            // ===== NEW: Generate Simple Receipt =====
            generateReceipt(recipientUsername, amount);

            setTimeout(() => hideMessage('transferMessage'), 3000);
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
// Receipt Functionality
// ============================================

function generateReceipt(recipient, amount) {
    const receiptID = "RCPT-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    const now = new Date();
    const date = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const receiptDiv = document.getElementById('receipt');
    if (receiptDiv) {
        receiptDiv.innerHTML = `
            <h3>Transaction Receipt</h3>
            <p><strong>Receipt ID:</strong> ${receiptID}</p>
            <p><strong>Recipient:</strong> ${recipient}</p>
            <p><strong>Amount Sent:</strong> $${amount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
        `;
    }
}

// ============================================
// Transaction History
// (unchanged)
async function loadTransactions() {
    if (!currentUser) return;
    const container = document.getElementById('transactionsContainer');
    try {
        const response = await fetch(`${API_URL}/transactions/${currentUser.id}`);
        const data = await response.json();
        if (data.success) {
            if (data.transactions.length === 0) {
                container.innerHTML = `<div class="no-transactions"><p>No transactions yet</p><p style="margin-top: 10px;">Start by sending money to someone!</p></div>`;
            } else {
                container.innerHTML = data.transactions.map(transaction => createTransactionHTML(transaction)).join('');
            }
        } else {
            container.innerHTML = `<div class="no-transactions"><p>Error loading transactions</p></div>`;
        }
    } catch (error) {
        console.error('Transactions fetch error:', error);
        container.innerHTML = `<div class="no-transactions"><p>Error loading transactions</p></div>`;
    }
}
function createTransactionHTML(transaction) {
    const isSent = transaction.type === 'sent';
    const otherUser = isSent ? transaction.toUsername : transaction.fromUsername;
    const icon = isSent ? '📤' : '📥';
    const typeText = isSent ? 'Sent to' : 'Received from';
    const amountPrefix = isSent ? '-' : '+';
    const date = formatDate(transaction.date);
    return `<div class="transaction-item"><div class="transaction-info"><div class="transaction-type ${transaction.type}"><span>${icon}</span><span>${typeText} ${otherUser}</span></div><div class="transaction-date">${date}</div></div><div class="transaction-amount ${transaction.type}">${amountPrefix}$${transaction.amount.toFixed(2)}</div></div>`;
}
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    else if (diffMins < 60) return `${diffMins} minute${diffMins>1?'s':''} ago`;
    else if (diffHours < 24) return `${diffHours} hour${diffHours>1?'s':''} ago`;
    else if (diffDays < 7) return `${diffDays} day${diffDays>1?'s':''} ago`;
    else return date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:date.getFullYear()!==now.getFullYear()?'numeric':undefined});
}

// ============================================
// Password Change
// ============================================

function changePassword(oldPassword, newPassword) {
    if (!currentUser) return alert('User not logged in');

    if (oldPassword !== currentUser.password) {
        return alert('Old password is incorrect');
    }

    currentUser.password = newPassword;
    localStorage.setItem('user', JSON.stringify(currentUser));

    alert('Password changed successfully!');
}

// ============================================
// Authentication & UI Helpers
// ============================================

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;
}

function hideMessage(elementId) {
    const messageEl = document.getElementById(elementId);
    messageEl.className = 'message';
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

// Auto-refresh every 30s
setInterval(async () => {
    if (currentUser) {
        await refreshBalance();
        await loadTransactions();
    }
}, 30000);
