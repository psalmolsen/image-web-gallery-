import { db } from "./firebase.js"
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"
import { createCard, closeAllDropdowns } from "./card.js"


// ─── Init ─────────────────────────────────────────────────────────────────────
// Fetches the card template from card.html, injects it into the DOM,
// then loads artworks. Order matters — template must exist before cards are built.

async function init() {
    const res = await fetch('card.html')
    const html = await res.text()
    const parser = new DOMParser()
    const cardDoc = parser.parseFromString(html, 'text/html')
    const template = cardDoc.querySelector('#cardTemplate')
    document.body.appendChild(document.adoptNode(template))

    await loadArtworks()
}
init()


// ─── Load Artworks ────────────────────────────────────────────────────────────
// Fetches all artwork documents from Firestore and renders a card for each one.

let allArtworks = [];
const layout = document.querySelector('#layout')
const emptyState = document.querySelector('#emptyState')

async function loadArtworks() {
    const result = await getDocs(collection(db, "artworks"))
    if (result.empty) {
        layout.innerHTML = ''
        emptyState.classList.remove('hidden')
        return
    }
    result.forEach(doc => {
        allArtworks.push({ ...doc.data(), id: doc.id })
    })
    renderCards(allArtworks)
}

function renderCards(artworks) {
    emptyState.classList.add('hidden')
    layout.innerHTML = ''
    artworks.forEach(artwork => {
        layout.appendChild(createCard(artwork, artwork.id))
    })
}


// ─── Mobile Share Bottom Sheet ────────────────────────────────────────────────
// Slide-up panel for sharing on mobile. Exposed on window so card.js can trigger it.

const shareSheetOverlay = document.querySelector('#shareSheetOverlay')
const shareSheet = document.querySelector('#shareSheet')
const shareSheetCopy = document.querySelector('#shareSheetCopy')
const shareSheetImageCode = document.querySelector('#shareSheetImageCode')
const shareSheetClose = document.querySelector('#shareSheetClose')
let activeShareUrl = ''

window.openShareSheet = function (url) {
    activeShareUrl = url
    shareSheetOverlay.classList.remove('pointer-events-none')
    requestAnimationFrame(() => {
        shareSheetOverlay.classList.remove('opacity-0')
        shareSheetOverlay.classList.add('opacity-100')
        shareSheet.classList.remove('translate-y-full')
        shareSheet.classList.add('translate-y-0')
    })
}

function closeShareSheet() {
    shareSheetOverlay.classList.remove('opacity-100')
    shareSheetOverlay.classList.add('opacity-0')
    shareSheet.classList.remove('translate-y-0')
    shareSheet.classList.add('translate-y-full')
    setTimeout(() => shareSheetOverlay.classList.add('pointer-events-none'), 300)
}

// Close on overlay tap or cancel button.
shareSheetOverlay?.addEventListener('click', closeShareSheet)
shareSheetClose?.addEventListener('click', closeShareSheet)

// Copy the link and show brief "Copied!" feedback.
shareSheetCopy?.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(activeShareUrl)
        const span = shareSheetCopy.querySelector('span')
        const original = span.textContent
        span.textContent = 'Copied!'
        setTimeout(() => span.textContent = original, 2000)
    } catch (err) {
        console.error(err)
    } finally {
        closeShareSheet()
    }
})

// Use the native share API if available.
shareSheetImageCode?.addEventListener('click', async () => {
    if (navigator.share) {
        try {
            await navigator.share({ title: document.title, url: activeShareUrl })
        } catch (err) {
            if (err.name !== 'AbortError') console.error(err)
        }
    }
    closeShareSheet()
})


// ─── Global Click Handler ─────────────────────────────────────────────────────
// Closes any open card menu or share dropdown when clicking outside.

document.addEventListener('click', () => {
    closeAllDropdowns()
})


// Search Filter 
// Filters artworks by title or artist name and renders the results

function filterArtworks(query) {
    const filtered = allArtworks.filter(artwork => {
        return artwork.title.toLowerCase().includes(query) || Object.values(artwork.artists).flat().join(' ').toLowerCase().includes(query)
    })
    if (filtered.length === 0) {
        layout.innerHTML = ''
        emptyState.classList.remove('hidden')
    } else {
        renderCards(filtered)
    }
}

document.querySelector('#searchInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const query = this.value.toLowerCase()
        filterArtworks(query)
    }


})



// ─── Footer Navigation ────────────────────────────────────────────────────────
// Toggles the active state between the Works and About Us nav buttons.

function footer() {
    const navWorks = document.querySelector('#nav-works')
    const navAbout = document.querySelector('#nav-about')

    function setActive(activeBtn, inactiveBtn) {
        activeBtn.querySelectorAll('svg, span').forEach(el => {
            el.classList.replace('text-stone-400', 'text-orange-600')
        })
        inactiveBtn.querySelectorAll('svg, span').forEach(el => {
            el.classList.replace('text-orange-600', 'text-stone-400')
        })
    }

    navWorks.addEventListener('click', () => setActive(navWorks, navAbout))
    navAbout.addEventListener('click', () => setActive(navAbout, navWorks))
}

footer()




//todo: make the name of cloudinary data be same as its title so that when manually delete it can be easily done
// todo: loading the frame or its structure
//todo: image qr code

//todo: deploy it but not searchable on puiblic so that we can test it with real link for sharing
//todo: pagination