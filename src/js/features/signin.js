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

const emailInput = document.getElementById("emailInput");
const signInButton = document.getElementById("signInBtn");
const spinner = document.getElementById("spinner");
const buttonText = document.getElementById("btnText");
const buttonArrow = document.getElementById("btnArrow");
const statusMessage = document.getElementById("statusMsg");
const statusText = document.getElementById("statusText");
const statusIcon = document.getElementById("statusIcon");

// TODO: sessionStorage auth has been replaced with Firebase Email Link Auth
// TODO: Consider adding onAuthStateChanged listener to show a loading state
// while Firebase checks auth — prevents flash of wrong UI on page load
function setLoading(isLoading) {
  signInButton.disabled = isLoading;
  spinner.style.display = isLoading ? "block" : "none";
  buttonText.textContent = isLoading ? "Checking..." : "Continue with Google";
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
      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>`,
  );
}

function showSuccess(message) {
  showStatus(
    "success",
    message,
    `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>`,
  );
}

function clearStatus() {
  statusMessage.className = "status mb-4";
}

async function handleSignIn() {
  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    showError("Please enter your Gmail address.");
    emailInput.focus();
    return;
  }

  if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
    showError("Only Gmail addresses are accepted.");
    emailInput.focus();
    return;
  }

  setLoading(true);

  try {
    const authorized = await isAuthorizedPublisher(email);

    if (!authorized) {
      showError("This Gmail is not authorized. Contact the administrator");
      setLoading(false);
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      login_hint: email,
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, provider);
    const selectedEmail = result.user.email?.toLowerCase() || "";

    if (selectedEmail !== email) {
      await firebaseSignOut(auth);
      showError("Please continue with the same Gmail address you entered.");
      setLoading(false);
      return;
    }

    if (!(await isAuthorizedPublisher(selectedEmail))) {
      await firebaseSignOut(auth);
      showError("This Gmail is not authorized. Contact the administrator");
      setLoading(false);
      return;
    }

    showSuccess("Access granted! Redirecting...");
    setTimeout(() => {
      window.location.href = buildPageUrl(window.location.href, "dashboard.html");
    }, 700);
  } catch (error) {
    console.error("[auth] Google sign-in failed:", error);
    // TODO: Add error boundaries â€” if Firebase fails silently right now the whole page breaks with no user feedback
    showError("Something went wrong. Please try again.");
    setLoading(false);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  if (await isPublisher()) {
    window.location.href = buildPageUrl(window.location.href, "dashboard.html");
    return;
  }

  await firebaseSignOut(auth);
});

signInButton.addEventListener("click", handleSignIn);
emailInput.addEventListener("input", clearStatus);
emailInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSignIn();
  }
});

document.querySelector(".viewer-link")?.setAttribute(
  "href",
  buildPageUrl(window.location.href, "dashboard.html"),
);
