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

// Category filtering
window.filterByCategory = function (category) {
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

document.addEventListener('click', () => {
    closeAllDropdowns()
})

//search
function filterArtworks(query) {
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


//todo: slow data fetching on searching

//todo: image qr code
//todo: deploy it but not searchable on public so that we can test it with real link for sharing
//todo: secure the site (no pop up ads etc.)
//todo: after development, uncheck the firebase development rules so that the database is secure and not all info fecthcing to the web
