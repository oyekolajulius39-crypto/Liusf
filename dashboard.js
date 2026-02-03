// ============================================
// Lius FinTech - Dashboard Script (Updated Final)
// ============================================

const API_URL = "https://lius-fintech-backend.onrender.com/api";
let currentUser = null;
let pendingTransfer = null; // For PIN verification

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

        // Initialize modals
        initPasswordModal();
        initPinModal();
        initSetPinModal();

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
// Transfer Functions with PIN
// ============================================

async function handleTransfer(event) {
    event.preventDefault();

    const recipientUsername = document.getElementById('recipientUsername').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);

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

    // Store pending transfer
    pendingTransfer = { recipientUsername, amount };

    // Show transaction PIN modal
    document.getElementById('pinModal').style.display = 'block';
}

async function executeTransfer(recipientUsername, amount) {
    const messageEl = document.getElementById('transferMessage');
    const button = document.getElementById('transferButton');

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
// Transaction History with full receipt
// ============================================

async function loadTransactions() {
    if (!currentUser) return;
    const container = document.getElementById('transactionsContainer');
    try {
        const response = await fetch(`${API_URL}/transactions/${currentUser.id}`);
        const data = await response.json();
        if (data.success) {
            if (data.transactions.length === 0) {
                container.innerHTML = `<div class="no-transactions"><p>No transactions yet</p><p style="margin-top:10px;">Start by sending money to someone!</p></div>`;
            } else {
                container.innerHTML = data.transactions.map(tx => createTransactionHTML(tx)).join('');
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
    const amountClass = isSent ? 'debit' : 'credit';
    const amountPrefix = isSent ? '-' : '+';
    const now = new Date(transaction.date);
    const dateStr = now.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const receiptID = transaction.receiptID || ("RCPT-" + Math.random().toString(36).substr(2,8).toUpperCase());

    return `
        <div class="transaction-item" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding:10px 0;">
            <div class="transaction-amount ${amountClass}" style="font-weight:bold; font-size:16px; color:${isSent?'red':'green'};">
                ${amountPrefix}$${transaction.amount.toFixed(2)}
            </div>
            <div class="transaction-details" style="text-align:right; font-size:14px;">
                <div><strong>${isSent?'Sent to':'Received from'}:</strong> ${otherUser}</div>
                <div><strong>Receipt ID:</strong> ${receiptID}</div>
                <div><strong>Date:</strong> ${dateStr} ${timeStr}</div>
            </div>
        </div>
    `;
}

// ============================================
// Modals: Change Password
// ============================================

function initPasswordModal() {
    const trigger = document.getElementById('changePasswordTrigger');
    const modal = document.getElementById('changePasswordModal');
    const closeBtn = document.getElementById('closePasswordModal');
    const form = document.getElementById('changePasswordForm');

    if (!trigger || !modal || !closeBtn || !form) return;

    trigger.addEventListener('click', () => modal.style.display = 'block');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('oldPassword').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        if (!oldPassword || !newPassword) return alert("Please fill in both fields");
        if (oldPassword !== currentUser.password) return alert("Old password is incorrect");

        currentUser.password = newPassword;
        localStorage.setItem('user', JSON.stringify(currentUser));
        alert("Password changed successfully!");
        form.reset();
        modal.style.display = 'none';
    });
}

// ============================================
// Modals: Set / Change PIN
// ============================================

function initSetPinModal() {
    const trigger = document.getElementById('setPinTrigger');
    const modal = document.getElementById('setPinModal');
    const closeBtn = document.getElementById('closeSetPinModal');
    const form = document.getElementById('setPinForm');

    if (!trigger || !modal || !closeBtn || !form) return;

    trigger.addEventListener('click', () => modal.style.display = 'block');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = document.getElementById('newPin').value.trim();
        if (pin.length !== 4 || isNaN(pin)) return alert("Enter a valid 4-digit PIN");

        currentUser.pin = pin;
        localStorage.setItem('user', JSON.stringify(currentUser));
        alert("PIN set/changed successfully!");
        form.reset();
        modal.style.display = 'none';
    });
}

// ============================================
// Transaction PIN Modal
// ============================================

function initPinModal() {
    const pinModal = document.getElementById('pinModal');
    const closePinModal = document.getElementById('closePinModal');
    const pinForm = document.getElementById('pinForm');

    if (!pinModal || !closePinModal || !pinForm) return;

    closePinModal.addEventListener('click', () => pinModal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === pinModal) pinModal.style.display = 'none'; });

    pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pinInput = document.getElementById('transactionPin').value.trim();
        const messageEl = document.getElementById('pinMessage');

        if (pinInput.length !== 4) {
            messageEl.textContent = "Enter a 4-digit PIN";
            messageEl.className = "message error show";
            return;
        }

        if (!currentUser.pin || pinInput !== currentUser.pin) {
            messageEl.textContent = "Incorrect PIN. Transaction denied.";
            messageEl.className = "message error show";
            return;
        }

        pinModal.style.display = 'none';
        messageEl.textContent = "";

        if (pendingTransfer) {
            await executeTransfer(pendingTransfer.recipientUsername, pendingTransfer.amount);
            pendingTransfer = null;
        }

        pinForm.reset();
    });
}

// ============================================
// Authentication & Helpers
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

function showLoading() { document.getElementById('loadingOverlay').classList.add('show'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show'); }

// Auto-refresh balance and transactions
setInterval(async () => {
    if (currentUser) {
        await refreshBalance();
        await loadTransactions();
    }
}, 30000);
