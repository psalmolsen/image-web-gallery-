import { db } from "./firebase.js"
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

const cardTemplate = document.querySelector('#cardTemplate')


// ─── Helpers ────────────────────────────────────────────────────────────────

function isVideoUrl(url) {
    return url.endsWith('.mp4') || url.includes('/video/')
}

function formatDate(dateStr) {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}


// ─── Media Block (handles both images and videos) ───────────────────────────

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

    // Render the media item at a given index (image or video)
    function renderMedia(index) {
        const url = imageUrls[index]

        imageCount.textContent = `${index + 1} / ${totalItems}`

        // update dots
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

    // Only show navigation and dots when there is more than 1 item
    if (totalItems > 1) {
        imageCount.classList.remove('hidden')
        dotsWrap.classList.remove('hidden')
        prevBtn.classList.remove('opacity-0', 'pointer-events-none')
        nextBtn.classList.remove('opacity-0', 'pointer-events-none')

        // Build dots
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


// ─── Artist Pills ────────────────────────────────────────────────────────────

function setupArtists(card, artists) {
    const container = card.querySelector('.card-artists')
    const roles = [
        { label: "Graphic Artist", value: artists?.graphicartist },
        { label: "Writer", value: artists?.writer },
        { label: "Videographer", value: artists?.videographer },
        { label: "Photographer", value: artists?.photographer },
    ].filter(a => a.value)

    roles.forEach(a => {
        const pill = document.createElement('span')
        pill.className = "text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 font-outfit"
        pill.innerHTML = `<span class="font-semibold">${a.label}:</span> ${a.value}`
        container.appendChild(pill)
    })
}


// ─── Create Card ─────────────────────────────────────────────────────────────

function createCard(artWorkData, docId) {
    const card = cardTemplate.content.cloneNode(true)

    const imageUrls = Array.isArray(artWorkData.image_urls)
        ? artWorkData.image_urls.filter(Boolean)
        : (artWorkData.image_url ? [artWorkData.image_url] : [])

    // Fill in text data
    card.querySelector('.card-title').textContent = artWorkData.title
    card.querySelector('.card-date').textContent = formatDate(artWorkData.date)
    card.querySelector('.card-overview').textContent = artWorkData.overview
    card.querySelector('.card-category').textContent = artWorkData.category
    card.querySelector('.card-link').href = `card.html?id=${docId}`

    // Set up media (images + videos)
    setupMedia(card, imageUrls, artWorkData.title)

    // Set up artist pills
    setupArtists(card, artWorkData.artists)

    return card
}


// ─── Load Artworks ───────────────────────────────────────────────────────────

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
        cardMenu(grid.lastElementChild, doc.id)
    })
}

loadArtworks()


// ─── Card Menu (edit / delete) ───────────────────────────────────────────────

function editData(docId) {
    // todo: implement edit functionality
    console.log("edit:", docId)
}

function cardMenu(card, docId) {
    const cardMenuBtn = card.querySelector('.card-menu')
    const dropdown = card.querySelector('.card-dropdown')
    const editBtn = card.querySelector('.card-edit')
    const deleteBtn = card.querySelector('.card-delete')

    cardMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.toggle('hidden')
    })

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.add('hidden')
        editData(docId)
    })

    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!window.confirm("Are you sure you want to delete this artwork?")) return
        await deleteDoc(doc(db, "artworks", docId))
        card.remove()
    })

    document.addEventListener('click', () => {
        dropdown.classList.add('hidden')
    })
}


// ─── Search Filter ───────────────────────────────────────────────────────────

document.querySelector('#searchInput').addEventListener('input', function () {
    const query = this.value.toLowerCase()
    document.querySelectorAll('#artworkGrid article').forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() ?? ''
        const overview = card.querySelector('.card-overview')?.textContent.toLowerCase() ?? ''
        card.style.display = (title.includes(query) || overview.includes(query)) ? '' : 'none'
    })
})


// ─── Footer Navigation ───────────────────────────────────────────────────────

function footer() {
    const worksSection = document.querySelector('#works')
    const aboutSection = document.querySelector('#about')
    const navWorks = document.querySelector('#nav-works')
    const navAbout = document.querySelector('#nav-about')

    function showSection(show, hide, activeBtn, inactiveBtn) {
        show.classList.remove('hidden')
        hide.classList.add('hidden')
        activeBtn.querySelectorAll('svg, span').forEach(el => {
            el.classList.replace('text-stone-400', 'text-orange-600')
        })
        inactiveBtn.querySelectorAll('svg, span').forEach(el => {
            el.classList.replace('text-orange-600', 'text-stone-400')
        })
    }

    navWorks.addEventListener('click', () => showSection(worksSection, aboutSection, navWorks, navAbout))
    navAbout.addEventListener('click', () => showSection(aboutSection, worksSection, navAbout, navWorks))

    showSection(worksSection, aboutSection, navWorks, navAbout)
}

footer()

//todo: make card be eye pleasing even if tehy are not the same size

//todo: make the name of cloudinary data be same as its title so that when manually delete i can be easily done