import { db } from "./firebase.js"
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

// grabs the card template from the HTML to be cloned later for each artwork
const cardTemplate = document.querySelector('#cardTemplate')


// ─── Helpers ───────

// converts raw date string (e.g. "2026-03-10") to readable format (e.g. "Mar 10, 2026")
function formatDate(dateStr) {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// checks if a URL is a video file so we know whether to show <img> or <video>
function isVideoUrl(url) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}


// ─── Media Block (handles both images and videos) ────────────────────────────

// sets up the media area of a card — shows images or videos, handles prev/next buttons, dots, counter, and swipe on mobile
function setupMedia(card, imageUrls, title) {
    const totalItems = imageUrls.length
    if (totalItems === 0) return

    const imageWrap = card.querySelector('.card-image-wrap')
    const imageEl = card.querySelector('.card-image')
    const videoEl = card.querySelector('.card-video')
    const imageCount = card.querySelector('.card-image-count')
    const dotsWrap = card.querySelector('.card-image-dots')
    const prevBtn = card.querySelector('.card-prev')
    const nextBtn = card.querySelector('.card-next')

    let currentIndex = 0
    let touchStartX = null
    let isAnimating = false

    imageWrap.classList.remove('hidden')

    // shows the correct image or video at the given position, and updates the counter + dots
    function renderMedia(index) {
        const url = imageUrls[index]

        imageCount.textContent = `${index + 1} / ${totalItems}`

        // highlights the active dot and dims the rest
        Array.from(dotsWrap.children).forEach((dot, i) => {
            dot.className = `h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white/95' : 'bg-white/45'}`
        })

        // shows video or image depending on the file type
        if (isVideoUrl(url)) {
            imageEl.classList.add('hidden')
            videoEl.classList.remove('hidden')
            videoEl.src = url
        } else {
            videoEl.classList.add('hidden')
            imageEl.classList.remove('hidden')
            imageEl.src = url
            imageEl.alt = title
        }
    }

    // navigation and swipe only needed when there is more than 1 file
    if (totalItems > 1) {
        imageCount.classList.remove('hidden')
        dotsWrap.classList.remove('hidden')
        prevBtn.classList.remove('opacity-0', 'pointer-events-none')
        nextBtn.classList.remove('opacity-0', 'pointer-events-none')

        // creates one dot per media item
        dotsWrap.innerHTML = ""
        for (let i = 0; i < totalItems; i++) {
            const dot = document.createElement('span')
            dot.className = "h-1.5 w-1.5 rounded-full bg-white/45"
            dotsWrap.appendChild(dot)
        }

        // returns whichever element (image or video) is currently being displayed
        function getActiveEl() {
            return isVideoUrl(imageUrls[currentIndex]) ? videoEl : imageEl
        }

        // slides out the current item and slides in the next one with animation
        function animateToIndex(nextIndex, direction) {
            if (isAnimating || nextIndex === currentIndex) return
            isAnimating = true

            const outX = direction === 'next' ? '-16%' : '16%'
            const inX = direction === 'next' ? '16%' : '-16%'

            getActiveEl().animate(
                [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${outX})`, opacity: 0.25 }],
                { duration: 180, easing: 'ease-out', fill: 'forwards' }
            ).onfinish = () => {
                currentIndex = nextIndex
                renderMedia(currentIndex)
                getActiveEl().animate(
                    [{ transform: `translateX(${inX})`, opacity: 0.25 }, { transform: 'translateX(0)', opacity: 1 }],
                    { duration: 220, easing: 'ease-out', fill: 'forwards' }
                ).onfinish = () => { isAnimating = false }
            }
        }

        // moves to the next or previous item (loops around when reaching the end)
        function goNext() { animateToIndex((currentIndex + 1) % totalItems, 'next') }
        function goPrev() { animateToIndex((currentIndex - 1 + totalItems) % totalItems, 'prev') }

        // wires up the prev/next buttons
        nextBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goNext() })
        prevBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goPrev() })

        // detects swipe start position on mobile
        imageWrap.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX
        }, { passive: true })

        // detects swipe direction — swipe left = next, swipe right = prev
        imageWrap.addEventListener('touchend', (e) => {
            if (touchStartX === null) return
            const delta = e.changedTouches[0].clientX - touchStartX
            if (Math.abs(delta) >= 40) delta < 0 ? goNext() : goPrev()
            touchStartX = null
        }, { passive: true })
    }

    // always show the first item on load
    renderMedia(0)
}


// ─── Artist Credits ───────────────────────────────────────────────────────────

// normalizes artist data to always be an array — handles old Firestore data that was saved as a plain string
function toArray(value) {
    if (Array.isArray(value)) return value
    if (value && value.trim() !== '') return [value]
    return []
}

// builds the orange artist pills at the bottom of each card, skipping any role with no names
function setupArtists(card, artists) {
    const container = card.querySelector('.card-artists')

    const roles = [
        { label: "Graphic Artist", value: toArray(artists?.graphicartist) },
        { label: "Writer", value: toArray(artists?.writer) },
        { label: "Videographer", value: toArray(artists?.videographer) },
        { label: "Photographer", value: toArray(artists?.photographer) },
    ].filter(a => a.value.length > 0)

    roles.forEach(role => {
        const pill = document.createElement('div')
        pill.className = 'bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex flex-col gap-1'

        const label = document.createElement('span')
        label.className = 'text-[0.6rem] font-bold font-syne text-orange-700 uppercase tracking-wider'
        label.textContent = role.label + ':'

        const namesDiv = document.createElement('div')
        namesDiv.className = 'flex flex-col gap-0.5'

        role.value.forEach(name => {
            const p = document.createElement('p')
            p.className = 'text-sm font-semibold text-orange-700 font-outfit pl-2'
            p.textContent = name
            namesDiv.appendChild(p)
        })

        pill.appendChild(label)
        pill.appendChild(namesDiv)
        container.appendChild(pill)
    })
}


// ─── Card Builder ───────────

// clones the HTML template and fills it with artwork data, then returns the finished card
function createCard(artWorkData, docId) {
    const card = cardTemplate.content.cloneNode(true)

    const formatted = formatDate(artWorkData.date)

    card.querySelector('.card-title').textContent = artWorkData.title
    card.querySelector('.card-date').textContent = formatted
    card.querySelector('.card-overview').textContent = artWorkData.overview
    card.querySelector('.card-category').textContent = artWorkData.category
    card.querySelector(".card-link").href = `card.html?id=${docId}`

    // normalizes image_url to always be an array before passing to setupMedia
    const imageUrls = artWorkData.image_url
        ? (Array.isArray(artWorkData.image_url) ? artWorkData.image_url : [artWorkData.image_url])
        : []
    setupMedia(card, imageUrls, artWorkData.title)

    setupArtists(card, artWorkData.artists)

    cardMenu(card, docId)
    cardshare(card, docId)
    return card
}


// ─── Load Artworks ────────────────────────────────────────────────────────────

// fetches all artworks from Firestore and adds them to the grid, shows empty state if none exist
async function loadArtworks() {
    const grid = document.querySelector('#artworkGrid')
    const emptyState = document.querySelector('#emptyState')

    const result = await getDocs(collection(db, "artworks"))

    if (result.empty) {
        emptyState.classList.remove('hidden')
        return
    }
    result.forEach(doc => {
        grid.appendChild(createCard(doc.data(), doc.id))
    })
}

loadArtworks()


// ─── Card Menu (edit / delete) ────────────────────────────────────────────────

// placeholder for edit — to be implemented later
function editData(docId) {
    console.log("edit:", docId)
}

// wires up the three-dot menu on each card — toggles dropdown, handles edit and delete
function cardMenu(card, docId) {
    const cardMenuBtn = card.querySelector('.card-menu')
    const dropdown = card.querySelector('.card-dropdown')
    const editBtn = card.querySelector('.card-edit')
    const deleteBtn = card.querySelector('.card-delete')

    // toggles the dropdown open/closed when the three-dot button is clicked
    cardMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.toggle('hidden')
    })

    // closes dropdown and triggers edit
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.add('hidden')
        editData(docId)
    })

    // asks for confirmation then deletes from Firestore and removes the card from the DOM
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!window.confirm("Are you sure you want to delete this artwork?")) return
        await deleteDoc(doc(db, "artworks", docId))
        card.remove()
    })

    // closes the dropdown when clicking anywhere else on the page
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden')
    })
}

function cardshare(card, docId) {
    const cardShareBtn = card.querySelector('.card-share')
    const sharedropdown = card.querySelector('.share-dropdown')
    const imagecode = card.querySelector('.image-code')
    const copylink = card.querySelector('.copy-link')

    const shareUrl = `${window.location.origin}/card.html?id=${docId}`

    cardShareBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (window.innerWidth < 768) {
            openShareSheet(shareUrl)
        } else {
            sharedropdown.classList.toggle('hidden')
        }
    })

    imagecode.addEventListener('click', async (e) => {
        e.stopPropagation()
        sharedropdown.classList.add('hidden')

        if (navigator.share) {
            try {
                await navigator.share({ title: document.title, url: shareUrl })
            } catch (err) {
                if (err.name !== 'AbortError') console.error(err)
            }
        }
    })

    copylink.addEventListener('click', async (e) => {
        e.stopPropagation()
        sharedropdown.classList.add('hidden')

        try {
            await navigator.clipboard.writeText(shareUrl)
            const span = copylink.querySelector('span') || copylink
            const original = span.textContent
            span.textContent = 'Copied!'
            setTimeout(() => span.textContent = original, 2000)
        } catch (err) {
            console.error(err)
        }
    })

    // ✅ No document listener here anymore
}

const shareSheetOverlay = document.querySelector('#shareSheetOverlay')
const shareSheet = document.querySelector('#shareSheet')
const shareSheetCopy = document.querySelector('#shareSheetCopy')
const shareSheetImageCode = document.querySelector('#shareSheetImageCode')
const shareSheetClose = document.querySelector('#shareSheetClose')
let activeShareUrl = ''

function openShareSheet(url) {
    activeShareUrl = url
    shareSheetOverlay.classList.remove('hidden')
    shareSheet.classList.remove('hidden')
}

function closeShareSheet() {
    shareSheetOverlay.classList.add('hidden')
    shareSheet.classList.add('hidden')
}

shareSheetOverlay.addEventListener('click', closeShareSheet)
shareSheetClose.addEventListener('click', closeShareSheet)

shareSheetCopy.addEventListener('click', async () => {
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

shareSheetImageCode.addEventListener('click', async () => {
    if (navigator.share) {
        try {
            await navigator.share({ title: document.title, url: activeShareUrl })
        } catch (err) {
            if (err.name !== 'AbortError') console.error(err)
        }
    }
    closeShareSheet()
})

// ✅ Just ONE time, outside the function, at the bottom of your script:
document.addEventListener('click', () => {
    document.querySelectorAll('.share-dropdown').forEach(d => d.classList.add('hidden'))
})


// ─── Search Filter ────────────────────────────────────────────────────────────

// hides/shows cards in real time based on whether the title or overview matches the search input
document.querySelector('#searchInput').addEventListener('input', function () {
    const query = this.value.toLowerCase()
    document.querySelectorAll('#artworkGrid article').forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() ?? ''
        const overview = card.querySelector('.card-overview')?.textContent.toLowerCase() ?? ''
        card.style.display = (title.includes(query) || overview.includes(query)) ? '' : 'none'
    })
})


// ─── Footer Navigation ────────────────────────────────────────────────────────

// controls switching between Works and About Us sections, and updates which nav button is active (orange vs grey)
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
