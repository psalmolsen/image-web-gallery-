// Helper functions

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

// Full content modal

export function openFullSheet(artworkData) {
    const overlay = document.getElementById('fullSheetOverlay')
    const sheet = document.getElementById('fullSheet')

    // Populate title, category, date
    document.getElementById('fullSheetTitle').textContent = artworkData.title || ''
    document.getElementById('fullSheetCategory').textContent = artworkData.category || ''
    document.getElementById('fullSheetDate').textContent = formatDate(artworkData.date)

    // Full content
    const fullContentWrap = document.getElementById('fullSheetFullContentWrap')
    const fullContentEl = document.getElementById('fullSheetFullContent')
    if (artworkData.fullcontext && artworkData.fullcontext.trim()) {
        fullContentEl.textContent = artworkData.fullcontext
        fullContentWrap.classList.remove('hidden')
    } else {
        fullContentWrap.classList.add('hidden')
    }

    // Media
    const mediaWrap = document.getElementById('fullSheetMedia')
    const imgEl = document.getElementById('fullSheetImage')
    const vidEl = document.getElementById('fullSheetVideo')
    const imageUrls = artworkData.image_urls ? (Array.isArray(artworkData.image_urls) ? artworkData.image_urls : [artworkData.image_urls]) : []

    if (imageUrls.length > 0) {
        const firstUrl = imageUrls[0]
        if (isVideoUrl(firstUrl)) {
            imgEl.classList.add('hidden')
            vidEl.classList.remove('hidden')
            vidEl.src = firstUrl
        } else {
            vidEl.classList.add('hidden')
            imgEl.classList.remove('hidden')
            imgEl.src = firstUrl
            imgEl.alt = artworkData.title || ''
        }
        mediaWrap.classList.remove('hidden')

        // Add click handler to open media viewer
        mediaWrap.style.cursor = 'pointer'
        mediaWrap.onclick = () => {
            openMediaViewer(imageUrls, 0)
        }
    } else {
        mediaWrap.classList.add('hidden')
    }

    // Artists
    const artistsContainer = document.getElementById('fullSheetArtists')
    artistsContainer.innerHTML = ''
    const roles = [
        { label: 'Graphic Artist', key: 'graphicartist' },
        { label: 'Writer', key: 'writer' },
        { label: 'Videographer', key: 'videographer' },
        { label: 'Photographer', key: 'photographer' }
    ]
    roles.forEach(role => {
        const artists = toArray(artworkData.artists?.[role.key])
        if (artists.length > 0) {
            const card = document.createElement('div')
            card.className = 'bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2'
            card.innerHTML = `
                <p class="text-[9px] font-syne font-bold uppercase text-[#6b6460] mb-1">${role.label}</p>
                <div class="flex flex-col gap-1">
                    ${artists.map(name => `
                        <div class="flex items-start gap-1.5">
                            <span class="text-[#e8874a]/60 shrink-0 mt-0.5">•</span>
                            <span class="text-sm font-outfit text-[#e8874a] break-words">${name}</span>
                        </div>
                    `).join('')}
                </div>
            `
            artistsContainer.appendChild(card)
        }
    })

    // Open modal with scale animation
    overlay.classList.remove('pointer-events-none')
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0')
        overlay.classList.add('opacity-100')
        sheet.classList.remove('scale-95', 'opacity-0')
        sheet.classList.add('scale-100', 'opacity-100')
    })
}

export function closeFullSheet() {
    const overlay = document.getElementById('fullSheetOverlay')
    const sheet = document.getElementById('fullSheet')

    overlay.classList.remove('opacity-100')
    overlay.classList.add('opacity-0')
    sheet.classList.remove('scale-100', 'opacity-100')
    sheet.classList.add('scale-95', 'opacity-0')

    setTimeout(() => {
        overlay.classList.add('pointer-events-none')
    }, 300)
}

// Media viewer modal

let mediaViewerState = {
    urls: [],
    currentIndex: 0,
    touchStartX: null
}

function preloadMedia(url) {
    return new Promise((resolve, reject) => {
        if (isVideoUrl(url)) {
            // For videos, just resolve immediately (videos load on demand)
            resolve()
        } else {
            const img = new Image()
            img.onload = () => resolve()
            img.onerror = () => reject()
            img.src = url
        }
    })
}

function prefetchAdjacentMedia(index, urls) {
    const nextIndex = (index + 1) % urls.length
    const prevIndex = (index - 1 + urls.length) % urls.length

    if (urls.length > 1) {
        preloadMedia(urls[nextIndex]).catch(() => { })
        preloadMedia(urls[prevIndex]).catch(() => { })
    }
}

function showMediaInViewer(index) {
    const { urls } = mediaViewerState
    const url = urls[index]

    const imgEl = document.getElementById('mediaViewerImage')
    const vidEl = document.getElementById('mediaViewerVideo')
    const counter = document.getElementById('mediaViewerCounter')

    counter.textContent = `${index + 1} / ${urls.length}`

    if (isVideoUrl(url)) {
        imgEl.classList.add('hidden')
        vidEl.classList.remove('hidden')
        vidEl.src = url
    } else {
        vidEl.classList.add('hidden')
        imgEl.classList.remove('hidden')
        imgEl.src = url
    }

    // Prefetch adjacent media
    prefetchAdjacentMedia(index, urls)
}

function updateNavigationButtons() {
    const { urls } = mediaViewerState
    const prevBtn = document.getElementById('mediaViewerPrev')
    const nextBtn = document.getElementById('mediaViewerNext')

    if (urls.length > 1) {
        prevBtn.classList.remove('opacity-0', 'pointer-events-none')
        nextBtn.classList.remove('opacity-0', 'pointer-events-none')
    } else {
        prevBtn.classList.add('opacity-0', 'pointer-events-none')
        nextBtn.classList.add('opacity-0', 'pointer-events-none')
    }
}

export function openMediaViewer(urls, startIndex) {
    mediaViewerState.urls = urls
    mediaViewerState.currentIndex = startIndex

    const overlay = document.getElementById('mediaViewerOverlay')
    const url = urls[startIndex]

    // Close full content modal first
    const fullSheetOverlay = document.getElementById('fullSheetOverlay')
    if (fullSheetOverlay && fullSheetOverlay.classList.contains('opacity-100')) {
        closeFullSheet()
    }

    // Wait for media to load before opening viewer
    preloadMedia(url).then(() => {
        showMediaInViewer(startIndex)
        updateNavigationButtons()

        overlay.classList.remove('pointer-events-none')
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0')
            overlay.classList.add('opacity-100')
        })
    }).catch(() => {
        alert('Failed to load media')
    })
}

function closeMediaViewer() {
    const overlay = document.getElementById('mediaViewerOverlay')
    const vidEl = document.getElementById('mediaViewerVideo')

    // Pause video if playing
    vidEl.pause()
    vidEl.src = ''

    overlay.classList.remove('opacity-100')
    overlay.classList.add('opacity-0')

    setTimeout(() => {
        overlay.classList.add('pointer-events-none')
    }, 300)
}

function navigateMedia(direction) {
    const { urls, currentIndex } = mediaViewerState
    const vidEl = document.getElementById('mediaViewerVideo')

    // Pause current video if playing
    if (!vidEl.classList.contains('hidden')) {
        vidEl.pause()
    }

    let newIndex
    if (direction === 'next') {
        newIndex = (currentIndex + 1) % urls.length
    } else {
        newIndex = (currentIndex - 1 + urls.length) % urls.length
    }

    mediaViewerState.currentIndex = newIndex
    showMediaInViewer(newIndex)
}

// QR Code modal

export function showQRModal(docId) {
    const qrCreator = window.QrCreator

    if (!qrCreator) {
        alert('QR Code library not loaded. Please refresh the page.')
        return
    }

    const overlay = document.getElementById('qrModalOverlay')
    const canvas = document.getElementById('qrCanvas')
    const domainEl = document.getElementById('qrDomain')

    if (!overlay || !canvas || !domainEl) {
        alert('Modal elements not found')
        return
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const pathPrefix = isLocal ? '/src' : ''
    const shareUrl = `${window.location.origin}${pathPrefix}/dashboard.html?artwork=${docId}`

    domainEl.textContent = window.location.hostname || 'image-gallery-2748a.web.app'
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    function openModal() {
        overlay.classList.remove('pointer-events-none')
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0')
            overlay.classList.add('opacity-100')
        })
    }

    try {
        qrCreator.render({
            text: shareUrl,
            radius: 0,
            ecLevel: 'M',
            fill: '#C0451A',
            background: '#ffffff',
            size: 240
        }, canvas)
        openModal()
    } catch (error) {
        console.error('QR generation failed:', error)
        alert(`Failed to generate QR code${error?.message ? `: ${error.message}` : ''}`)
    }
}

function closeQRModal() {
    const overlay = document.getElementById('qrModalOverlay')

    overlay.classList.remove('opacity-100')
    overlay.classList.add('opacity-0')

    setTimeout(() => {
        overlay.classList.add('pointer-events-none')
    }, 300)
}

function downloadQRCode() {
    const qrCard = document.getElementById('qrCard')

    // Use html2canvas to capture the entire QR card
    import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js').then(module => {
        const html2canvas = module.default

        html2canvas(qrCard, {
            backgroundColor: '#FAF3E8',
            scale: 2
        }).then(canvas => {
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'iMAGE-QR-Code.png'
                a.click()
                URL.revokeObjectURL(url)
            })
        })
    })
}

// Make showQRModal globally available
window.showQRModal = showQRModal



// Event listeners

// Setup event listeners after DOM is ready
setTimeout(() => {
    // Full content modal listeners
    const fullSheetOverlay = document.getElementById('fullSheetOverlay')
    const fullSheetClose = document.getElementById('fullSheetClose')

    fullSheetOverlay?.addEventListener('click', (e) => {
        if (e.target === fullSheetOverlay) closeFullSheet()
    })
    fullSheetClose?.addEventListener('click', closeFullSheet)

    // Media viewer listeners
    const closeBtn = document.getElementById('mediaViewerClose')
    const prevBtn = document.getElementById('mediaViewerPrev')
    const nextBtn = document.getElementById('mediaViewerNext')
    const overlay = document.getElementById('mediaViewerOverlay')
    const container = document.getElementById('mediaViewerContainer')

    closeBtn?.addEventListener('click', closeMediaViewer)
    prevBtn?.addEventListener('click', () => navigateMedia('prev'))
    nextBtn?.addEventListener('click', () => navigateMedia('next'))

    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) closeMediaViewer()
    })

    // Touch swipe support
    container?.addEventListener('touchstart', (e) => {
        mediaViewerState.touchStartX = e.changedTouches[0].clientX
    }, { passive: true })

    container?.addEventListener('touchend', (e) => {
        if (mediaViewerState.touchStartX === null) return
        const delta = e.changedTouches[0].clientX - mediaViewerState.touchStartX
        if (Math.abs(delta) >= 50) {
            delta < 0 ? navigateMedia('next') : navigateMedia('prev')
        }
        mediaViewerState.touchStartX = null
    }, { passive: true })

    // QR modal listeners
    const qrModalOverlay = document.getElementById('qrModalOverlay')
    const qrModalClose = document.getElementById('qrModalClose')
    const qrDownloadBtn = document.getElementById('qrDownloadBtn')

    qrModalOverlay?.addEventListener('click', (e) => {
        if (e.target === qrModalOverlay) closeQRModal()
    })
    qrModalClose?.addEventListener('click', closeQRModal)
    qrDownloadBtn?.addEventListener('click', downloadQRCode)


    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const sheet = document.getElementById('fullSheet')
            if (sheet && sheet.classList.contains('scale-100')) {
                closeFullSheet()
            }
            const mediaViewer = document.getElementById('mediaViewerOverlay')
            if (mediaViewer && mediaViewer.classList.contains('opacity-100')) {
                closeMediaViewer()
            }
        }
    })
}, 500)
