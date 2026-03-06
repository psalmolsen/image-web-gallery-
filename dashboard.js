import { db } from "./firebase.js"
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

function createCard(artworkData, docId) {
    // Clone the template from HTML
    const template = document.getElementById("cardTemplate")
    const card = template.content.cloneNode(true)

    // Fill in simple text fields
    card.querySelector(".card-date").textContent = artworkData.date || ""
    card.querySelector(".card-category").textContent = artworkData.category || ""
    card.querySelector(".card-title").textContent = artworkData.title || ""
    card.querySelector(".card-overview").textContent = artworkData.overview || ""
    card.querySelector(".card-link").href = `card.html?id=${docId}`

    // Show image only if URL exists
    if (artworkData.image_url) {
        const imageWrap = card.querySelector(".card-image-wrap")
        const image = card.querySelector(".card-image")
        image.src = artworkData.image_url
        image.alt = artworkData.title
        imageWrap.classList.remove("hidden")
    }

    // Build artist pills — only for roles that have a name
    const artistsContainer = card.querySelector(".card-artists")
    const roles = [
        { label: "Graphic Artist", value: artworkData.artists?.graphicartist },
        { label: "Writer", value: artworkData.artists?.writer },
        { label: "Videographer", value: artworkData.artists?.videographer },
        { label: "Photographer", value: artworkData.artists?.photographer },
    ].filter(a => a.value)

    roles.forEach(a => {
        const pill = document.createElement("span")
        pill.className = "text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 font-outfit"
        pill.innerHTML = `<span class="font-semibold">${a.label}:</span> ${a.value}`
        artistsContainer.appendChild(pill)
    })

    return card
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
        grid.appendChild(createCard(doc.data(), doc.id))
    })
}

loadArtworks()