import { db } from "./firebase.js"
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"

const cardTemplate = document.querySelector('#cardTemplate')

//clone and fill card template with data from firestore, then return the card element
function createCard(artWorkData, docId) {
    const card = cardTemplate.content.cloneNode(true)
    const formatted = artWorkData.date
        ? new Date(artWorkData.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : ""


    //card filler
    card.querySelector('.card-title').textContent = artWorkData.title
    card.querySelector('.card-date').textContent = formatted
    card.querySelector('.card-overview').textContent = artWorkData.overview
    card.querySelector('.card-category').textContent = artWorkData.category
    card.querySelector(".card-link").href = `card.html?id=${docId}`



    // Show image only if URL exists
    if (artWorkData.image_url) {
        card.querySelector('.card-image').src = artWorkData.image_url
        card.querySelector('.card-image').alt = artWorkData.title
        card.querySelector('.card-image-wrap').classList.remove('hidden')
    }


    // Build artist pills — only for roles that have a name
    const artistsContainer = card.querySelector('.card-artists')
    const roles = [
        { label: "Graphic Artist", value: artWorkData.artists?.graphicartist },
        { label: "Writer", value: artWorkData.artists?.writer },
        { label: "Videographer", value: artWorkData.artists?.videographer },
        { label: "Photographer", value: artWorkData.artists?.photographer },
    ].filter(a => a.value)
    roles.forEach(a => {
        const pill = document.createElement('span')
        pill.className = "text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-3 py-1 font-outfit"
        pill.innerHTML = `<span class="font-semibold">${a.label}:</span> ${a.value}`
        artistsContainer.appendChild(pill)
    })

    cardMenu(card, docId)
    return card
}

//load artworks to dashboard 
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

function cardMenu(card, docId) {
    const cardMenuBtn = card.querySelector('.card-menu')
    const dropdown = card.querySelector('.card-dropdown')

    cardMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.toggle('hidden')
    })
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden')
    })
}
// cardMenu(card, docId)

function footer() {
    const worksSection = document.querySelector('#works')
    const aboutSection = document.querySelector('#about')

    const navWorks = document.querySelector('#nav-works')
    const navAbout = document.querySelector('#nav-about')

    function showSection(show, hide, activeBtn, inactiveBtn) {
        show.classList.remove('hidden')
        hide.classList.add('hidden')
        // active button → orange
        activeBtn.querySelectorAll('svg, span').forEach(el => {
            el.classList.remove('text-stone-400')
            el.classList.add('text-orange-600')
        })
        // inactive button → stone
        inactiveBtn.querySelectorAll('svg, span').forEach(el => {
            el.classList.remove('text-orange-600')
            el.classList.add('text-stone-400')
        })
    }

    navWorks.addEventListener('click', () => {
        showSection(worksSection, aboutSection, navWorks, navAbout)
    })

    navAbout.addEventListener('click', () => {
        showSection(aboutSection, worksSection, navAbout, navWorks)
    })

    // set works as active on load
    showSection(worksSection, aboutSection, navWorks, navAbout)
}
footer()


