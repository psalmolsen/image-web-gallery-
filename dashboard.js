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

            <!-- Artists -->
            ${artistsSection}

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

