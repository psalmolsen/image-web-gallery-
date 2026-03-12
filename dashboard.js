import { db } from "./firebase.js"
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

const cardTemplate = document.querySelector('#cardTemplate')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isVideoUrl(url) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}


// ─── Media Block ──────────────────────────────────────────────────────────────

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

    function renderMedia(index) {
        const url = imageUrls[index]
        imageCount.textContent = `${index + 1} / ${totalItems}`
        Array.from(dotsWrap.children).forEach((dot, i) => {
            dot.className = `h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white/95' : 'bg-white/45'}`
        })
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

    if (totalItems > 1) {
        imageCount.classList.remove('hidden')
        dotsWrap.classList.remove('hidden')
        prevBtn.classList.remove('opacity-0', 'pointer-events-none')
        nextBtn.classList.remove('opacity-0', 'pointer-events-none')

        dotsWrap.innerHTML = ""
        for (let i = 0; i < totalItems; i++) {
            const dot = document.createElement('span')
            dot.className = "h-1.5 w-1.5 rounded-full bg-white/45"
            dotsWrap.appendChild(dot)
        }

        function getActiveEl() {
            return isVideoUrl(imageUrls[currentIndex]) ? videoEl : imageEl
        }

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

        function goNext() { animateToIndex((currentIndex + 1) % totalItems, 'next') }
        function goPrev() { animateToIndex((currentIndex - 1 + totalItems) % totalItems, 'prev') }

        nextBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goNext() })
        prevBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goPrev() })

        imageWrap.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].clientX
        }, { passive: true })

        imageWrap.addEventListener('touchend', (e) => {
            if (touchStartX === null) return
            const delta = e.changedTouches[0].clientX - touchStartX
            if (Math.abs(delta) >= 40) delta < 0 ? goNext() : goPrev()
            touchStartX = null
        }, { passive: true })
    }

    renderMedia(0)
}


// ─── Artist Credits ───────────────────────────────────────────────────────────

function toArray(value) {
    if (Array.isArray(value)) return value
    if (value && value.trim() !== '') return [value]
    return []
}

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


// ─── Card Builder ─────────────────────────────────────────────────────────────

function createCard(artWorkData, docId) {
    const card = cardTemplate.content.cloneNode(true)
    card.querySelector('.card-title').textContent = artWorkData.title
    card.querySelector('.card-date').textContent = formatDate(artWorkData.date)
    card.querySelector('.card-overview').textContent = artWorkData.overview
    card.querySelector('.card-category').textContent = artWorkData.category
    card.querySelector(".card-link").href = `card.html?id=${docId}`

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

function editData(docId) {
    console.log("edit:", docId)
}

// single tracker for card menu dropdown — same pattern as share
let activeCardDropdown = null

function cardMenu(card, docId) {
    const cardMenuBtn = card.querySelector('.card-menu')
    const dropdown = card.querySelector('.card-dropdown')
    const editBtn = card.querySelector('.card-edit')
    const deleteBtn = card.querySelector('.card-delete')

    cardMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (activeCardDropdown && activeCardDropdown !== dropdown) {
            activeCardDropdown.classList.add('hidden')
        }
        dropdown.classList.toggle('hidden')
        activeCardDropdown = dropdown.classList.contains('hidden') ? null : dropdown
    })

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.add('hidden')
        activeCardDropdown = null
        editData(docId)
    })

    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!window.confirm("Are you sure you want to delete this artwork?")) return
        await deleteDoc(doc(db, "artworks", docId))
        card.closest('article')?.remove()
    })
}


// ─── Card Share ───────────────────────────────────────────────────────────────

// single tracker — only ever touches 1 dropdown on click, no looping
let activeShareDropdown = null

function openDropdown(el) {
    el.classList.remove('hidden')
    requestAnimationFrame(() => {
        el.classList.add('opacity-100', 'translate-y-0', 'scale-100')
        el.classList.remove('opacity-0', '-translate-y-1', 'scale-95')
    })
}

function closeDropdown(el) {
    el.classList.add('opacity-0', '-translate-y-1', 'scale-95')
    el.classList.remove('opacity-100', 'translate-y-0', 'scale-100')
    setTimeout(() => el.classList.add('hidden'), 200)
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
            // mobile — open bottom sheet
            openShareSheet(shareUrl)
        } else {
            // desktop — fast tracked dropdown toggle
            if (activeShareDropdown && activeShareDropdown !== sharedropdown) {
                closeDropdown(activeShareDropdown)
            }
            if (sharedropdown.classList.contains('hidden')) {
                openDropdown(sharedropdown)
                activeShareDropdown = sharedropdown
            } else {
                closeDropdown(sharedropdown)
                activeShareDropdown = null
            }
        }
    })

    imagecode.addEventListener('click', async (e) => {
        e.stopPropagation()
        sharedropdown.classList.add('hidden')
        activeShareDropdown = null
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
        activeShareDropdown = null
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
}


// ─── Mobile Share Bottom Sheet ────────────────────────────────────────────────

const shareSheetOverlay = document.querySelector('#shareSheetOverlay')
const shareSheet = document.querySelector('#shareSheet')
const shareSheetCopy = document.querySelector('#shareSheetCopy')
const shareSheetImageCode = document.querySelector('#shareSheetImageCode')
const shareSheetClose = document.querySelector('#shareSheetClose')
let activeShareUrl = ''

function openShareSheet(url) {
    activeShareUrl = url
    // make visible first, then animate in on next frame so transition fires
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
    // disable overlay clicks after animation completes
    setTimeout(() => {
        shareSheetOverlay.classList.add('pointer-events-none')
    }, 300)
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


// ─── Global click — closes any open dropdown (touches 1 element max) ─────────

document.addEventListener('click', () => {
    if (activeShareDropdown) {
        closeDropdown(activeShareDropdown)
        activeShareDropdown = null
    }
    if (activeCardDropdown) {
        activeCardDropdown.classList.add('hidden')
        activeCardDropdown = null
    }
})


// ─── Search Filter ────────────────────────────────────────────────────────────

document.querySelector('#searchInput').addEventListener('input', function () {
    const query = this.value.toLowerCase()
    document.querySelectorAll('#artworkGrid article').forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() ?? ''
        const overview = card.querySelector('.card-overview')?.textContent.toLowerCase() ?? ''
        card.style.display = (title.includes(query) || overview.includes(query)) ? '' : 'none'
    })
})


// ─── Footer Navigation ────────────────────────────────────────────────────────

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
//todo: search