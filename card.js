import { db } from "./firebase.js"
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"


// ─── Helpers ──────────────────────────────────────────────────────────────────
// Small utility functions used across the card logic.

function formatDate(dateStr) {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isVideoUrl(url) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

function toArray(value) {
    if (Array.isArray(value)) return value
    if (value && value.trim() !== '') return [value]
    return []
}


// ─── Media Block ──────────────────────────────────────────────────────────────
// Renders the image/video area and handles carousel navigation and swipe.

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

    // Swap the visible media and update counter/dots.
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

    // Only show nav controls if there's more than one item.
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

        // Slide out the current item and slide in the next.
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

        // Swipe left/right on touch devices.
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
// Builds and inserts the artist role pills into the card.

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
        pill.className = 'px-4 py-1 flex flex-col gap-1'
        const label = document.createElement('span')
        label.className = 'text-xs font-bold font-syne text-orange-700 uppercase tracking-wider'
        label.textContent = role.label + ':'
        const namesDiv = document.createElement('div')
        namesDiv.className = 'flex flex-col gap-0.5'
        role.value.forEach(name => {
            const p = document.createElement('p')
            p.className = 'text-sm font-normal text-orange-700 font-outfit pl-2 truncate'
            p.textContent = name
            namesDiv.appendChild(p)
        })
        pill.appendChild(label)
        pill.appendChild(namesDiv)
        container.appendChild(pill)
    })
}


// ─── Card Builder ─────────────────────────────────────────────────────────────
// Clones the template and fills it with artwork data. Returns a ready DOM node.

export function createCard(artWorkData, docId) {
    const cardTemplate = document.querySelector('#cardTemplate')
    const card = cardTemplate.content.cloneNode(true)

    card.querySelector('.card-title').textContent = artWorkData.title
    card.querySelector('.card-date').textContent = formatDate(artWorkData.date)
    card.querySelector('.card-overview').textContent = artWorkData.overview

    // "... more / less" inline toggle like Instagram
    const overviewEl = card.querySelector('.card-overview')
    const toggleBtn = card.querySelector('.card-overview-toggle')
    setTimeout(() => {
        if (overviewEl.scrollHeight > overviewEl.clientHeight) {
            toggleBtn.classList.remove('hidden')
            let expanded = false
            toggleBtn.addEventListener('click', () => {
                expanded = !expanded
                overviewEl.style.webkitLineClamp = expanded ? 'unset' : '3'
                overviewEl.style.lineClamp = expanded ? 'unset' : '3'
                overviewEl.style.overflow = expanded ? 'visible' : 'hidden'
                overviewEl.style.display = expanded ? 'inline' : '-webkit-box'
                toggleBtn.textContent = expanded ? ' less' : '... more'
            })
        }
    }, 100)
    card.querySelector('.card-category').textContent = artWorkData.category
    card.querySelector('.card-link').href = `card.html?id=${docId}`

    const imageUrls = artWorkData.image_url
        ? (Array.isArray(artWorkData.image_url) ? artWorkData.image_url : [artWorkData.image_url])
        : []

    setupMedia(card, imageUrls, artWorkData.title)
    setupArtists(card, artWorkData.artists)
    cardMenu(card, docId)
    cardShare(card, docId)
    return card
}


// ─── Card Menu ────────────────────────────────────────────────────────────────
// Handles the three-dot dropdown: edit and delete actions.

function editData(docId) {
    // TODO: implement edit flow
    console.log("edit:", docId)
}

let activeCardDropdown = null

function cardMenu(card, docId) {
    const cardMenuBtn = card.querySelector('.card-menu')
    const dropdown = card.querySelector('.card-dropdown')
    const editBtn = card.querySelector('.card-edit')
    const deleteBtn = card.querySelector('.card-delete')

    // Toggle this dropdown; close any other open one first.
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

    // Confirm, delete from Firestore, then remove the card from the DOM.
    // Note: this only deletes the Firestore record — Cloudinary files must be removed manually.
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!window.confirm("Are you sure you want to delete this artwork?")) return
        await deleteDoc(doc(db, "artworks", docId))
        card.closest('article')?.remove()
    })
}


// ─── Card Share ───────────────────────────────────────────────────────────────
// Handles the share button: dropdown on desktop, bottom sheet on mobile.

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

function cardShare(card, docId) {
    const cardShareBtn = card.querySelector('.card-share')
    const sharedropdown = card.querySelector('.share-dropdown')
    const imagecode = card.querySelector('.image-code')
    const copylink = card.querySelector('.copy-link')

    const shareUrl = `${window.location.origin}/card.html?id=${docId}`

    // Mobile opens the bottom sheet; desktop toggles the dropdown.
    cardShareBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (window.innerWidth < 768) {
            if (typeof window.openShareSheet === 'function') window.openShareSheet(shareUrl)
        } else {
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

    // Use the native share API if available (mainly mobile).
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

    // Copy the link and show brief "Copied!" feedback.
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


// ─── Close All Dropdowns ──────────────────────────────────────────────────────
// Called by the global click handler in dashboard.js to close any open menus.

export function closeAllDropdowns() {
    if (activeShareDropdown) {
        closeDropdown(activeShareDropdown)
        activeShareDropdown = null
    }
    if (activeCardDropdown) {
        activeCardDropdown.classList.add('hidden')
        activeCardDropdown = null
    }
}