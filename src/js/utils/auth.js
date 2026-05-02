import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { isAuthorizedPublisher } from "../services/artworks.js";
import { auth } from "../services/firebase.js";
import { buildPageUrl } from "./url.js";

// TODO: Replace sessionStorage auth with Firebase Email Link Auth — sessionStorage can be spoofed via browser console
// TODO: sessionStorage auth has been replaced with Firebase Email Link Auth
// TODO: Consider adding onAuthStateChanged listener to show a loading state
// while Firebase checks auth — prevents flash of wrong UI on page load
export function getCurrentUser() {
  return auth.currentUser;
}

export function getPublisherEmail() {
  return auth.currentUser?.email || null;
}

export async function isPublisher() {
  const email = getPublisherEmail();
  if (!email) return false;
  return isAuthorizedPublisher(email.toLowerCase());
}

export function requirePublisherAuth(currentHref, onAuthorized) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = buildPageUrl(currentHref, "signin.html");
      return;
    }

    if (!(await isPublisher())) {
      await firebaseSignOut(auth);
      window.location.href = buildPageUrl(currentHref, "signin.html");
      return;
    }

    if (typeof onAuthorized === "function") {
      onAuthorized(user);
    }
  });
}

export async function signOut(currentHref) {
  await firebaseSignOut(auth);
  window.location.href = buildPageUrl(currentHref, "signin.html");
}
