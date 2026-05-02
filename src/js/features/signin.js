import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { isAuthorizedPublisher } from "../services/artworks.js";
import { auth } from "../services/firebase.js";
import { isPublisher } from "../utils/auth.js";
import { buildPageUrl } from "../utils/url.js";

const signInButton = document.getElementById("signInBtn");
const spinner = document.getElementById("spinner");
const buttonText = document.getElementById("btnText");
const buttonArrow = document.getElementById("btnArrow");

const statusMessage = document.getElementById("statusMsg");
const statusText = document.getElementById("statusText");
const statusIcon = document.getElementById("statusIcon");

// TODO: sessionStorage auth has been replaced with Firebase Auth
// TODO: Consider adding a loading screen while Firebase checks auth state
// to prevent UI flicker on page load
// TODO: Optionally log unauthorized access attempts for admin monitoring

// UI HELPERS 
function setLoading(isLoading) {
  signInButton.disabled = isLoading;
  spinner.style.display = isLoading ? "block" : "none";
  buttonText.textContent = isLoading
    ? "Signing in..."
    : "Continue with Google";
  buttonArrow.style.display = isLoading ? "none" : "block";
}

function showStatus(type, message, iconPath) {
  statusMessage.className = `status ${type} mb-4`;
  statusIcon.innerHTML = iconPath;
  statusText.textContent = message;
}

function showError(message) {
  showStatus(
    "error",
    message,
    `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>`
  );
}

function showSuccess(message) {
  showStatus(
    "success",
    message,
    `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
      d="M5 13l4 4L19 7"/>`
  );
}

function clearStatus() {
  statusMessage.className = "status mb-4";
}

// SIGN IN LOGIC 
async function handleSignIn() {
  setLoading(true);

  try {
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    const email = result.user.email?.toLowerCase();

    if (!email) {
      throw new Error("No email found");
    }

    const authorized = await isAuthorizedPublisher(email);

    if (!authorized) {
      await firebaseSignOut(auth);

      // TODO: Track unauthorized login attempt (Firestore/logging service)
      showError("This account is not authorized. Contact the administrator.");
      setLoading(false);
      return;
    }

    showSuccess("Access granted! Redirecting...");

    setTimeout(() => {
      window.location.href = buildPageUrl(
        window.location.href,
        "dashboard.html"
      );
    }, 700);
  } catch (error) {
    console.error("[auth] Google sign-in failed:", error);

    // TODO: Add better error handling for specific Firebase errors
    showError("Something went wrong. Please try again.");
    setLoading(false);
  }
}

//  AUTH STATE CHECK
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // TODO: Add loading UI here before redirecting
  if (await isPublisher()) {
    window.location.href = buildPageUrl(
      window.location.href,
      "dashboard.html"
    );
    return;
  }

  await firebaseSignOut(auth);
});

//  EVENTS 
signInButton.addEventListener("click", handleSignIn);

document
  .querySelector(".viewer-link")
  ?.setAttribute(
    "href",
    buildPageUrl(window.location.href, "dashboard.html")
  );