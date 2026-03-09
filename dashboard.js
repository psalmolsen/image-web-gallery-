// import { db } from "./firebase.js"
// import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

// async function loadArtworks() {
//     const result = await getDocs(collection(db, "artworks"))
//     result.forEach(doc => {
//         const artworkData = doc.data()

//         document.getElementById("artworkGrid").innerHTML +=
//             `<div>
//                 <h2>${artworkData.title}</h2>
//                 <p>${artworkData.description}</p>
//                 <img src="${artworkData.image_url}" alt="${artworkData.title}" />
//             </div>`

//     })
// }

// loadArtworks()


import { db } from "./firebase.js"
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

function renderImage(url, title) {
    if (!url) return ""
    return `
        <div class="w-full bg-stone-100">
            <img 
                src="${url}" 
                alt="${title}" 
                class="w-full h-auto block"
                onerror="this.parentElement.style.display='none'"
            />
        </div>
    `
}

<<<<<<< Updated upstream
function renderArtists(artists) {
    if (!artists) return ""
    const roles = [
        { label: "Graphic Artist", value: artists.graphicartist },
        { label: "Writer", value: artists.writer },
        { label: "Videographer", value: artists.videographer },
        { label: "Photographer", value: artists.photographer },
    ].filter(a => a.value)

    if (roles.length === 0) return ""

    return `
        <div class="px-4 pb-2 flex flex-wrap gap-2">
            ${roles.map(a => `
                <span class="text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 font-outfit">
                    <span class="font-semibold">${a.label}:</span> ${a.value}
                </span>
            `).join("")}
        </div>
    `
=======
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


// ─── Artist Credits ──────────────────────────────────────────────────────────

// Normalizes artist value to an array — handles legacy string data from Firestore
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
>>>>>>> Stashed changes
}

function createCardHTML(artworkData, docId) {
    const imageSection = renderImage(artworkData.image_url, artworkData.title)
    const artistsSection = renderArtists(artworkData.artists)

    return `
        <article class="bg-white border border-stone-200 rounded-2xl overflow-hidden">

            <!-- Post Header -->
            <div class="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
                <div class="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shrink-0">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs text-stone-400">${artworkData.date || ""}</p>
                </div>
                <span class="text-xs font-syne font-bold tracking-wider uppercase text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 shrink-0">
                    ${artworkData.category || ""}
                </span>
            </div>

            <!-- Full Image -->
            ${imageSection}

            <!-- Title — strong emphasis -->
            <div class="px-4 pt-4 pb-1">
                <div class="w-8 h-0.5 bg-orange-500 rounded-full mb-3"></div>
                <h2 class="font-fraunces text-2xl italic font-semibold leading-snug text-stone-600">
                    ${artworkData.title}
                </h2>
            </div>

            <!-- Overview -->
            <div class="px-4 pt-1 pb-2">
                <p class="text-sm leading-relaxed text-stone-500 font-outfit italic">
                    ${artworkData.overview || ""}
                </p>
            </div>

<<<<<<< Updated upstream
            <!-- Artists -->
            ${artistsSection}
=======
    // Set up artist credits
    setupArtists(card, artWorkData.artists)
>>>>>>> Stashed changes

            <!-- Footer -->
            <div class="px-4 py-3 border-t border-stone-100 mt-2">
                <a href="card.html?id=${docId}"
                   class="group flex items-center gap-2 text-sm font-bold font-syne tracking-wide text-orange-600 hover:text-orange-700 transition-colors duration-200">
                    <span>See Full Content</span>
                    <svg class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                    </svg>
                </a>
            </div>

        </article>
    `
}

async function loadArtworks() {
    const grid = document.getElementById("artworkGrid")
    const emptyState = document.getElementById("emptyState")

    const result = await getDocs(collection(db, "artworks"))

    if (result.empty) {
        emptyState.classList.remove("hidden")
        return
    }

    result.forEach(doc => {
        const artworkData = doc.data()
        grid.innerHTML += createCardHTML(artworkData, doc.id)
    })
}

loadArtworks()

<<<<<<< Updated upstream
=======

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
//todo:(on desktop view) dont just make the upper card be allgined . use pointerest for inspo for card allginement even different sizes 
//todo: make the name of cloudinary data be same as its title so that when manually delete i can be easily done
>>>>>>> Stashed changes
