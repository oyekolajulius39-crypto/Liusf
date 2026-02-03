// ============================================
// Lius FinTech - Authentication Script (UPDATED)
// Face Verification Removed Completely
// ============================================

const API_URL = "https://lius-fintech-backend.onrender.com/api";

// ============================================
// Tab Navigation
// ============================================

function showLogin() {
  document.getElementById("loginForm").classList.add("active");
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");

  document.getElementById("loginFormElement").reset();
  hideMessage("loginMessage");
}

function showRegister() {
  document.getElementById("registerForm").classList.add("active");
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");

  document.getElementById("registerFormElement").reset();
  hideMessage("registerMessage");
}

// ============================================
// Authentication Functions
// ============================================

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const button = document.getElementById("loginButton");

  showLoading();
  button.disabled = true;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("user", JSON.stringify(data.user));

      showMessage("loginMessage", "Login successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      showMessage("loginMessage", data.message, "error");
    }
  } catch (error) {
    console.error("Login error:", error);
    showMessage("loginMessage", "Network error. Please try again.", "error");
  } finally {
    hideLoading();
    button.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword").value;
  const button = document.getElementById("registerButton");

  if (password !== confirmPassword) {
    showMessage("registerMessage", "Passwords do not match", "error");
    return;
  }

  showLoading();
  button.disabled = true;

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showMessage(
        "registerMessage",
        "Account created successfully! You can now login.",
        "success"
      );

      document.getElementById("registerFormElement").reset();

      setTimeout(() => {
        showLogin();
      }, 2000);
    } else {
      showMessage("registerMessage", data.message, "error");
    }
  } catch (error) {
    console.error("Registration error:", error);
    showMessage("registerMessage", "Network error. Please try again.", "error");
  } finally {
    hideLoading();
    button.disabled = false;
  }
}

// ============================================
// UI Helper Functions
// ============================================

function showMessage(elementId, message, type) {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = message;
  messageEl.className = `message ${type} show`;
}

function hideMessage(elementId) {
  const messageEl = document.getElementById(elementId);
  messageEl.className = "message";
}

function showLoading() {
  document.getElementById("loadingOverlay").classList.add("show");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("show");
}

// ============================================
// Initialization
// ============================================

window.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("user");
  if (user) {
    window.location.href = "dashboard.html";
  }
});
