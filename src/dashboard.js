import { db } from "./firebase.js"
import { collection, getDocs, query, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"
import { createCard, closeAllDropdowns } from "./card.js"
import { openFullSheet } from "./modals.js"

async function init() {
    // Load card template
    const cardRes = await fetch('card.html')
    const cardHtml = await cardRes.text()
    const cardParser = new DOMParser()
    const cardDoc = cardParser.parseFromString(cardHtml, 'text/html')
    const cardTemplate = cardDoc.querySelector('#cardTemplate')
    document.body.appendChild(document.adoptNode(cardTemplate))

    // Load modals
    const modalsRes = await fetch('modals.html')
    const modalsHtml = await modalsRes.text()
    const modalsParser = new DOMParser()
    const modalsDoc = modalsParser.parseFromString(modalsHtml, 'text/html')
    const modalsContent = modalsDoc.body.children
    Array.from(modalsContent).forEach(el => {
        document.body.appendChild(document.adoptNode(el))
    })
}
init()


let lastVisible = null
let isLoading = false
let hasMore = true
let allArtworks = []
let isSearching = false
const layout = document.querySelector('#layout')
const emptyState = document.querySelector('#emptyState')
const worksSection = document.querySelector('#worksSection')
const aboutSection = document.querySelector('#aboutSection')
const fab = document.querySelector('.fab')
const navWorksButtons = document.querySelectorAll('[data-nav-target="works"]')
const navAboutButtons = document.querySelectorAll('[data-nav-target="about"]')
let currentView = 'works'

// Toast notification function
function showCopyToast() {
    const toast = document.getElementById('copyToast')
    if (!toast) return

    toast.classList.remove('opacity-0', 'pointer-events-none')
    toast.classList.add('opacity-100')

    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none')
        toast.classList.remove('opacity-100')
    }, 3000)
}

// Make it globally available for card.js
window.showCopyToast = showCopyToast

function updateNavStyles() {
    navWorksButtons.forEach(btn => {
        const isActive = currentView === 'works'
        btn.classList.toggle('text-orange-500', isActive)
        btn.classList.toggle('text-stone-500', !isActive)
        if (btn.classList.contains('border-b-2')) {
            btn.classList.toggle('border-orange-500', isActive)
            btn.classList.toggle('border-transparent', !isActive)
        }
        btn.querySelectorAll('svg, span').forEach(el => {
            el.classList.toggle('text-orange-500', isActive)
            el.classList.toggle('text-[#4a4a4a]', !isActive)
        })
    })

    navAboutButtons.forEach(btn => {
        const isActive = currentView === 'about'
        btn.classList.toggle('text-orange-500', isActive)
        btn.classList.toggle('text-stone-500', !isActive)
        if (btn.classList.contains('border-b-2')) {
            btn.classList.toggle('border-orange-500', isActive)
            btn.classList.toggle('border-transparent', !isActive)
        }
        btn.querySelectorAll('svg, span').forEach(el => {
            el.classList.toggle('text-orange-500', isActive)
            el.classList.toggle('text-[#4a4a4a]', !isActive)
        })
    })
}

function setActiveView(view) {
    currentView = view
    const showWorks = view === 'works'

    worksSection?.classList.toggle('hidden', !showWorks)
    aboutSection?.classList.toggle('hidden', showWorks)
    fab?.classList.toggle('hidden', !showWorks)

    updateNavStyles()
    window.scrollTo({ top: 0, behavior: 'smooth' })
}




//delete artworks
function onDelete(deletedId) {
    allArtworks = allArtworks.filter(a => a.id !== deletedId)
    renderCards(allArtworks)
}



function renderCards(artworks) {
    emptyState.classList.add('hidden')

    // Clear all columns
    const cols = [document.getElementById('col-0'), document.getElementById('col-1'), document.getElementById('col-2')]
    cols.forEach(col => col.innerHTML = '')

    // Get number of visible columns based on screen width
    function getColumnCount() {
        if (window.innerWidth >= 1024) return 3 // large breakpoint
        if (window.innerWidth >= 768) return 2  // medium breakpoint
        return 1
    }

    const columnCount = getColumnCount()

    artworks.forEach((artwork, index) => {
        const { card, init } = createCard(artwork, artwork.id, onDelete)

        // Round-robin: distribute cards in order (0, 1, 2, 0, 1, 2...)
        const columnIndex = index % columnCount

        // Append to column
        cols[columnIndex].appendChild(card)
        init()
    })
}

const shareSheetOverlay = document.querySelector('#shareSheetOverlay')
const shareSheet = document.querySelector('#shareSheet')
const shareSheetCopy = document.querySelector('#shareSheetCopy')
const shareSheetImageCode = document.querySelector('#shareSheetImageCode')
const shareSheetClose = document.querySelector('#shareSheetClose')
let activeShareUrl = ''
let activeShareDocId = ''

window.openShareSheet = function (url, docId) {
    activeShareUrl = url
    activeShareDocId = docId
    shareSheetOverlay.classList.remove('pointer-events-none')
    requestAnimationFrame(() => {
        shareSheetOverlay.classList.remove('opacity-0')
        shareSheetOverlay.classList.add('opacity-100')
        shareSheet.classList.remove('translate-y-full')
        shareSheet.classList.add('translate-y-0')
    })
}

// Category filtering
window.filterByCategory = function (category) {
    setActiveView('works')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    isSearching = true
    const filtered = allArtworks.filter(artwork => {
        return artwork.category === category
    })

    // Update banner
    const bannerContent = document.querySelector('#bannerContent')
    const categoryBanner = document.querySelector('#categoryBanner')
    const artistBanner = document.querySelector('#artistBanner')
    const categoryName = document.querySelector('#categoryName')
    const artworkCount = document.querySelector('#artworkCount')

    // Hide default content and artist banner, show category banner
    bannerContent.classList.add('hidden')
    artistBanner.classList.add('hidden')
    categoryBanner.classList.remove('hidden')

    // Update category name and count
    categoryName.textContent = category
    artworkCount.textContent = filtered.length

    if (filtered.length === 0) {
        layout.innerHTML = ''
        emptyState.classList.remove('hidden')
    } else {
        renderCards(filtered)
    }
}

// Artist filtering
window.filterByArtist = function (artistName) {
    setActiveView('works')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    isSearching = true
    const filtered = allArtworks.filter(artwork => {
        // Check if artist name exists in any role
        return Object.values(artwork.artists).flat().includes(artistName)
    })

    // Update banner
    const bannerContent = document.querySelector('#bannerContent')
    const categoryBanner = document.querySelector('#categoryBanner')
    const artistBanner = document.querySelector('#artistBanner')
    const artistNameEl = document.querySelector('#artistName')
    const artistNameText = document.querySelector('#artistNameText')
    const artistCount = document.querySelector('#artistCount')

    // Hide default content and category banner, show artist banner
    bannerContent.classList.add('hidden')
    categoryBanner.classList.add('hidden')
    artistBanner.classList.remove('hidden')

    // Update artist name and count
    artistNameEl.textContent = artistName
    artistNameText.textContent = artistName
    artistCount.textContent = filtered.length

    if (filtered.length === 0) {
        layout.innerHTML = ''
        emptyState.classList.remove('hidden')
    } else {
        renderCards(filtered)
    }
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
        showCopyToast()
    } catch (err) {
        console.error(err)
    } finally {
        closeShareSheet()
    }
})



shareSheetImageCode?.addEventListener('click', () => {
    closeShareSheet()
    if (typeof window.showQRModal === 'function') {
        window.showQRModal(activeShareDocId)
    }
})

document.addEventListener('click', () => {
    closeAllDropdowns()
})

//search
function filterArtworks(query) {
    setActiveView('works')
    isSearching = true
    const filtered = allArtworks.filter(artwork => {
        return artwork.title.toLowerCase().includes(query) ||
            artwork.category.toLowerCase().includes(query) ||
            Object.values(artwork.artists).flat().join(' ').toLowerCase().includes(query)
    })
    if (filtered.length === 0) {
        layout.innerHTML = ''
        emptyState.classList.remove('hidden')
    } else {
        renderCards(filtered)
    }
}

function bindSearch(input) {
    if (!input) return
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === 'Go' || e.key === 'Search') {
            e.preventDefault()
            const query = this.value.trim().toLowerCase()
            if (query) {
                filterArtworks(query)
            } else {
                setActiveView('works')
                isSearching = false
                renderCards(allArtworks)
            }
        }
    })
    input.addEventListener('search', function () {
        const query = this.value.trim().toLowerCase()
        if (query) {
            filterArtworks(query)
        } else {
            setActiveView('works')
            isSearching = false
            renderCards(allArtworks)
        }
    })
}

function performSearch(input) {
    if (!input) return
    const query = input.value.trim().toLowerCase()
    if (query) {
        filterArtworks(query)
    } else {
        setActiveView('works')
        isSearching = false
        renderCards(allArtworks)
    }
}

bindSearch(document.querySelector('#searchInput'))
bindSearch(document.querySelector('#searchInputMob'))

document.querySelector('#searchBtn')?.addEventListener('click', () => {
    performSearch(document.querySelector('#searchInput'))
})
document.querySelector('#searchBtnMob')?.addEventListener('click', () => {
    performSearch(document.querySelector('#searchInputMob'))
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
            const docId = doc.id
            if (!allArtworks.find(a => a.id === docId)) {
                allArtworks.push({ ...artworkData, id: docId })
            }
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

// Check if there's an artwork parameter in URL and open full content modal
const urlParams = new URLSearchParams(window.location.search)
const artworkId = urlParams.get('artwork')
if (artworkId) {
    // Wait for artworks to load, then find and open the specific artwork
    const checkAndOpen = setInterval(() => {
        const artwork = allArtworks.find(a => a.id === artworkId)
        if (artwork) {
            clearInterval(checkAndOpen)
            openFullSheet(artwork)
        }
    }, 100)

    // Stop checking after 10 seconds if artwork not found
    setTimeout(() => clearInterval(checkAndOpen), 10000)
}

window.addEventListener('scroll', () => {
    if (isSearching) return
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        loadMoreArtworks()
    }
})

// Re-layout on window resize
let resizeTimeout
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
        if (!isSearching) renderCards(allArtworks)
    }, 250)
})


function footer() {
    navWorksButtons.forEach(btn => {
        btn.addEventListener('click', () => setActiveView('works'))
    })

    navAboutButtons.forEach(btn => {
        btn.addEventListener('click', () => setActiveView('about'))
    })

    updateNavStyles()
}

footer()


//todo: slow data fetching on searching

//todo: image qr code
//todo: secure the site (no pop up ads etc.)
//todo: after development, uncheck the firebase development rules so that the database is secure and not all info fecthcing to the web
//todo: filter some times not accurate (simetimes iot only show one artwotrks even if the artwqorks is 2 )

//todo: Warning: cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI: https://tailwindcss.com/docs/installation
//todo: dl qr code
//todo: qr on mobile