import { db } from "./firebase.js"
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

// ─── DOM refs ────────────────────────────────────────────────────────────────
const emailInput = document.getElementById('emailInput')
const signInBtn = document.getElementById('signInBtn')
const spinner = document.getElementById('spinner')
const btnText = document.getElementById('btnText')
const btnArrow = document.getElementById('btnArrow')
const statusMsg = document.getElementById('statusMsg')
const statusText = document.getElementById('statusText')
const statusIcon = document.getElementById('statusIcon')

// ─── UI helpers ──────────────────────────────────────────────────────────────
function setLoading(loading) {
    signInBtn.disabled = loading
    spinner.style.display = loading ? 'block' : 'none'
    btnText.textContent = loading ? 'Checking...' : 'Sign In'
    btnArrow.style.display = loading ? 'none' : 'block'
}

function showError(msg) {
    statusMsg.className = 'status error mb-4'
    statusIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>`
    statusText.textContent = msg
}

function showSuccess(msg) {
    statusMsg.className = 'status success mb-4'
    statusIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>`
    statusText.textContent = msg
}

function clearStatus() {
    statusMsg.className = 'status mb-4'
}

// ─── Auth check ──────────────────────────────────────────────────────────────
async function checkPublisherAccess(email) {
    const snapshot = await getDocs(collection(db, "publishers"))
    const authorizedEmails = snapshot.docs.map(doc =>
        doc.data().email?.toLowerCase().trim()
    )
    return authorizedEmails.includes(email)
}

// ─── Sign in handler ─────────────────────────────────────────────────────────
async function handleSignIn() {
    const email = emailInput.value.trim().toLowerCase()

    if (!email) {
        showError('Please enter your Gmail address.')
        emailInput.focus()
        return
    }

    const gmailRegex = /^[^\s@]+@gmail\.com$/i
    if (!gmailRegex.test(email)) {
        showError('Only Gmail addresses are accepted.')
        emailInput.focus()
        return
    }

    setLoading(true)

    try {
        const isAuthorized = await checkPublisherAccess(email)

        if (isAuthorized) {
            showSuccess('Access granted! Redirecting...')
            sessionStorage.setItem('publisher_email', email)
            sessionStorage.setItem('publisher_auth', 'true')
            setTimeout(() => {
                window.location.href = 'dashboard.html'
            }, 1000)
        } else {
            showError('This Gmail is not authorized. Contact the administrator')
            setLoading(false)
        }
    } catch (err) {
        console.error('[auth] Sign-in failed:', err)
        showError('Something went wrong. Please try again.')
        setLoading(false)
    }
}

// ─── Event listeners ─────────────────────────────────────────────────────────
signInBtn.addEventListener('click', handleSignIn)

emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSignIn()
})

emailInput.addEventListener('input', clearStatus)

// ─── Session helpers (used by posting.js / dashboard.js) ─────────────────────
export function requirePublisherAuth() {
    if (sessionStorage.getItem('publisher_auth') !== 'true') {
        window.location.href = 'signin.html'
    }
}

export function isPublisher() {
    return sessionStorage.getItem('publisher_auth') === 'true'
}

export function getPublisherEmail() {
    return sessionStorage.getItem('publisher_email') || null
}

export function signOut() {
    sessionStorage.removeItem('publisher_auth')
    sessionStorage.removeItem('publisher_email')
    window.location.href = 'signin.html'
}