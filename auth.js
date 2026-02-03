// ============================================
// Lius FinTech - Authentication Script
// ============================================

const API_URL = 'https://lius-fintech-backend.onrender.com/api';

// Global variables for face images
let loginFaceImage = null;
let registerFaceImage = null;

// ============================================
// Tab Navigation
// ============================================

/**
 * Show login form and hide register form
 */
function showLogin() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    
    // Reset forms
    document.getElementById('loginFormElement').reset();
    hideMessage('loginMessage');
    stopCamera('login');
}

/**
 * Show register form and hide login form
 */
function showRegister() {
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    
    // Reset forms
    document.getElementById('registerFormElement').reset();
    hideMessage('registerMessage');
    stopCamera('register');
}

// ============================================
// Camera & Face Capture
// ============================================

/**
 * Start camera for face capture
 * @param {string} mode - 'login' or 'register'
 */
async function startCamera(mode) {
    const video = document.getElementById(`${mode}Video`);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640, 
                height: 480,
                facingMode: 'user'
            } 
        });
        video.srcObject = stream;
        video.style.display = 'block';
        document.getElementById(`${mode}Preview`).style.display = 'none';
    } catch (error) {
        console.error('Camera access error:', error);
        showMessage(`${mode}Message`, 'Camera access denied. Please allow camera permissions.', 'error');
    }
}

/**
 * Stop camera stream
 * @param {string} mode - 'login' or 'register'
 */
function stopCamera(mode) {
    const video = document.getElementById(`${mode}Video`);
    const stream = video.srcObject;
    
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
}

/**
 * Capture face image for login
 */
async function captureLoginFace() {
    await captureFace('login');
}

/**
 * Capture face image for registration
 */
async function captureRegisterFace() {
    await captureFace('register');
}

/**
 * Capture face image from video stream
 * @param {string} mode - 'login' or 'register'
 */
async function captureFace(mode) {
    const video = document.getElementById(`${mode}Video`);
    const canvas = document.getElementById(`${mode}Canvas`);
    const preview = document.getElementById(`${mode}Preview`);
    const status = document.getElementById(`${mode}FaceStatus`);
    
    // Start camera if not already started
    if (!video.srcObject) {
        await startCamera(mode);
        // Wait a bit for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to base64 image
    const faceImage = canvas.toDataURL('image/jpeg', 0.8);
    
    // Store face image
    if (mode === 'login') {
        loginFaceImage = faceImage;
    } else {
        registerFaceImage = faceImage;
    }
    
    // Show preview
    preview.innerHTML = `<img src="${faceImage}" alt="Face Preview">`;
    preview.style.display = 'block';
    video.style.display = 'none';
    
    // Update status
    status.textContent = 'Face captured successfully ✓';
    status.classList.add('success');
    status.classList.remove('error');
    
    // Stop camera
    stopCamera(mode);
}

// ============================================
// Authentication Functions
// ============================================

/**
 * Handle user login
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    const button = document.getElementById('loginButton');
    
    // Validate face capture
    if (!loginFaceImage) {
        showMessage('loginMessage', 'Please capture your face for verification', 'error');
        return;
    }
    
    // Show loading
    showLoading();
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                faceImage: loginFaceImage
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showMessage('loginMessage', 'Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showMessage('loginMessage', data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginMessage', 'Network error. Please try again.', 'error');
    } finally {
        hideLoading();
        button.disabled = false;
    }
}

/**
 * Handle user registration
 * @param {Event} event - Form submit event
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const messageEl = document.getElementById('registerMessage');
    const button = document.getElementById('registerButton');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showMessage('registerMessage', 'Passwords do not match', 'error');
        return;
    }
    
    // Validate face capture
    if (!registerFaceImage) {
        showMessage('registerMessage', 'Please capture your face for verification', 'error');
        return;
    }
    
    // Show loading
    showLoading();
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                faceImage: registerFaceImage
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('registerMessage', 'Account created successfully! You can now login.', 'success');
            
            // Reset form
            document.getElementById('registerFormElement').reset();
            registerFaceImage = null;
            document.getElementById('registerPreview').innerHTML = '';
            document.getElementById('registerPreview').style.display = 'none';
            document.getElementById('registerFaceStatus').textContent = 'Face not captured';
            document.getElementById('registerFaceStatus').classList.remove('success');
            
            // Switch to login tab after 2 seconds
            setTimeout(() => {
                showLogin();
            }, 2000);
        } else {
            showMessage('registerMessage', data.message, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('registerMessage', 'Network error. Please try again.', 'error');
    } finally {
        hideLoading();
        button.disabled = false;
    }
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
// Initialization
// ============================================

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user');
    if (user) {
        // Redirect to dashboard if already logged in
        window.location.href = 'dashboard.html';
    }
});

// Clean up camera streams when page unloads
window.addEventListener('beforeunload', () => {
    stopCamera('login');
    stopCamera('register');
});
