import { db } from "./firebase.js"
import { collection, getDocs, query, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"
import { createCard, closeAllDropdowns, openFullSheet } from "./card.js"

async function init() {
    const res = await fetch('card.html')
    const html = await res.text()
    const parser = new DOMParser()
    const cardDoc = parser.parseFromString(html, 'text/html')
    const template = cardDoc.querySelector('#cardTemplate')
    document.body.appendChild(document.adoptNode(template))

}
init()


let lastVisible = null
let isLoading = false
let hasMore = true
let allArtworks = []
const layout = document.querySelector('#layout')
const emptyState = document.querySelector('#emptyState')




//delete artworks
function onDelete(deletedId) {
    allArtworks = allArtworks.filter(a => a.id !== deletedId)
    renderCards(allArtworks)
}



function renderCards(artworks) {
    emptyState.classList.add('hidden')
    layout.innerHTML = ''
    artworks.forEach(artwork => {
        const { card, init } = createCard(artwork, artwork.id, onDelete)
        layout.appendChild(card)
        init()
    })
}

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

shareSheetOverlay?.addEventListener('click', closeShareSheet)
shareSheetClose?.addEventListener('click', closeShareSheet)

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

// Full sheet close handlers
const fullSheetOverlay = document.getElementById('fullSheetOverlay')
const fullSheetClose = document.getElementById('fullSheetClose')

function closeFullSheet() {
    const overlay = document.getElementById('fullSheetOverlay')
    const sheet = document.getElementById('fullSheet')

    overlay.classList.remove('opacity-100')
    overlay.classList.add('opacity-0')
    sheet.classList.remove('scale-100', 'opacity-100')
    sheet.classList.add('scale-95', 'opacity-0')

    setTimeout(() => {
        overlay.classList.add('pointer-events-none')
    }, 300)
}

fullSheetOverlay?.addEventListener('click', (e) => {
    if (e.target === fullSheetOverlay) closeFullSheet()
})
fullSheetClose?.addEventListener('click', closeFullSheet)

document.addEventListener('click', () => {
    closeAllDropdowns()
})

function filterArtworks(query) {
    const filtered = allArtworks.filter(artwork => {
        return artwork.title.toLowerCase().includes(query) ||
            Object.values(artwork.artists).flat().join(' ').toLowerCase().includes(query)
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

async function loadMoreArtworks() {
    // let lastVisible = null
    // let isLoading = false
    // let hasMore = true
    // let allArtworks = []

    if (isLoading || !hasMore) return
    isLoading = true
    try {
        const artworksRef = collection(db, "artworks")
        let artworkQuery

        if (lastVisible) {
            artworkQuery = query(artworksRef, orderBy("date", "desc"), startAfter(lastVisible), limit(6))

        } else {
            artworkQuery = query(artworksRef, orderBy("date", "desc"), limit(6))
        }
        const result = await getDocs(artworkQuery)
        if (result.empty) {
            hasMore = false
            isLoading = false
            if (allArtworks.length === 0) {
                layout.innerHTML = ''
                emptyState.classList.remove('hidden')
            }
            return
        }
        result.docs.forEach(doc => {
            const artworkData = doc.data()
            allArtworks.push({ ...artworkData, id: doc.id })
        })
        lastVisible = result.docs[result.docs.length - 1]
        if (result.docs.length < 6) {
            hasMore = false
        }
        renderCards(allArtworks)
        isLoading = false
    }
    catch (error) {
        console.error(error)
        isLoading = false
    }
}
loadMoreArtworks()
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        loadMoreArtworks()
    }
})


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




//todo: image qr code
//todo: deploy it but not searchable on public so that we can test it with real link for sharing
//todo: pagination
//todo: secure the site (no pop up ads etc.)
//todo: the galer archive (put a disclamair like this : All images/ videos uploaded are owned by iMAGE. Cropping or taking out the watermark is strictly prohibited. You are free to tag, grab and/ or download all pictures uploaded by the organization.)
//todo: after posting multiple file in one card, it glitch on the early times using th ecourusellei