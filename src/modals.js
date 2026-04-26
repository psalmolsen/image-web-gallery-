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
    const categoryEl = document.getElementById('fullSheetCategory')
    categoryEl.textContent = artworkData.category || ''
    categoryEl.style.cursor = 'pointer'
    categoryEl.onclick = () => {
        closeFullSheet()
        setTimeout(() => {
            if (typeof window.filterByCategory === 'function') {
                window.filterByCategory(artworkData.category)
            }
        }, 300)
    }
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
                            <button type="button" data-artist="${name}" class="text-sm font-outfit text-[#e8874a] break-words text-left cursor-pointer hover:underline underline-offset-4 decoration-[#e8874a] bg-transparent border-none p-0">${name}</button>
                        </div>
                    `).join('')}
                </div>
            `
            artistsContainer.appendChild(card)

            card.querySelectorAll('button[data-artist]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const name = btn.getAttribute('data-artist')
                    closeFullSheet()
                    setTimeout(() => {
                        if (typeof window.filterByArtist === 'function') {
                            window.filterByArtist(name)
                        }
                    }, 300)
                })
            })
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

let currentArtworkTitle = ''

export function showQRModal(docId, artworkTitle) {
    currentArtworkTitle = artworkTitle || 'Artwork'

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

    domainEl.textContent = currentArtworkTitle
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
            size: 252
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

async function downloadQRCode() {
    const downloadBtn = document.getElementById('qrDownloadBtn')
    const btnLabel = downloadBtn?.querySelector('span')
    const originalLabel = btnLabel?.textContent

    if (downloadBtn) downloadBtn.disabled = true
    if (btnLabel) btnLabel.textContent = 'Saving...'

    try {
        const qrCanvas = document.getElementById('qrCanvas')
        const logoImg = document.querySelector('#qrCard img')

        // Card dimensions (matching the HTML design at 2x scale)
        const SCALE = 2
        const W = 360 * SCALE
        const PADDING = 20 * SCALE
        const QR_SIZE = 252 * SCALE
        const QR_FRAME = 268 * SCALE
        const RADIUS = 16 * SCALE

        // Compute total height
        const TOP_BAR = 3 * SCALE
        const HEADER_H = 72 * SCALE
        const LABEL_H = 36 * SCALE
        const QR_SECTION_H = QR_FRAME + 24 * SCALE
        const FOOTER_H = 80 * SCALE
        const H = TOP_BAR + HEADER_H + LABEL_H + QR_SECTION_H + FOOTER_H

        const out = document.createElement('canvas')
        out.width = W
        out.height = H
        const ctx = out.getContext('2d')

        // ── Helpers ──────────────────────────────────────────────────────────
        function roundRect(x, y, w, h, r) {
            ctx.beginPath()
            ctx.moveTo(x + r, y)
            ctx.lineTo(x + w - r, y)
            ctx.quadraticCurveTo(x + w, y, x + w, y + r)
            ctx.lineTo(x + w, y + h - r)
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
            ctx.lineTo(x + r, y + h)
            ctx.quadraticCurveTo(x, y + h, x, y + h - r)
            ctx.lineTo(x, y + r)
            ctx.quadraticCurveTo(x, y, x + r, y)
            ctx.closePath()
        }

        function loadImage(src) {
            return new Promise((resolve) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => resolve(img)
                img.onerror = () => resolve(null)
                img.src = src
            })
        }

        // ── Card background ───────────────────────────────────────────────────
        roundRect(0, 0, W, H, RADIUS)
        ctx.fillStyle = '#141414'
        ctx.fill()

        // ── Orange top gradient bar ───────────────────────────────────────────
        const grad = ctx.createLinearGradient(0, 0, W, 0)
        grad.addColorStop(0, '#e8874a')
        grad.addColorStop(1, '#c0451a')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, TOP_BAR)

        // ── Header: logo + brand text ─────────────────────────────────────────
        let y = TOP_BAR + 20 * SCALE

        // load logo
        const logo = await loadImage(logoImg?.src || 'imgs/image_logo.jpg')

        // Logo circle
        const LOGO_SIZE = 38 * SCALE
        const logoX = PADDING
        const logoY = y
        ctx.save()
        ctx.beginPath()
        ctx.arc(logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2, LOGO_SIZE / 2, 0, Math.PI * 2)
        ctx.strokeStyle = '#e8874a'
        ctx.lineWidth = 1 * SCALE
        ctx.stroke()
        ctx.clip()
        if (logo) ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE)
        ctx.restore()

        // Brand "iMAGE"
        const textX = logoX + LOGO_SIZE + 12 * SCALE
        ctx.font = `italic ${22 * SCALE}px serif`
        ctx.fillStyle = '#e8874a'
        ctx.fillText('i', textX, logoY + 22 * SCALE)
        const iWidth = ctx.measureText('i').width
        ctx.fillStyle = '#e2d9cf'
        ctx.fillText('MAGE', textX + iWidth, logoY + 22 * SCALE)

        // Subtitle
        ctx.font = `bold ${7 * SCALE}px sans-serif`
        ctx.fillStyle = '#6b6460'
        ctx.letterSpacing = `${2 * SCALE}px`
        ctx.fillText('CVSU CARMONA  ·  ARTWORK GALLERY', textX, logoY + 36 * SCALE)
        ctx.letterSpacing = '0px'

        // Header divider
        y = TOP_BAR + HEADER_H
        ctx.strokeStyle = '#2a2a2a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()

        // ── "Artwork QR Code" label ───────────────────────────────────────────
        y += 16 * SCALE
        ctx.font = `bold ${7 * SCALE}px sans-serif`
        ctx.fillStyle = '#6b6460'
        ctx.letterSpacing = `${2 * SCALE}px`
        ctx.fillText('ARTWORK QR CODE', PADDING, y + 8 * SCALE)
        ctx.letterSpacing = '0px'

        // ── QR frame + white background ───────────────────────────────────────
        y += LABEL_H
        const frameX = (W - QR_FRAME) / 2
        const frameY = y

        // White QR background
        const innerX = frameX + 8 * SCALE
        const innerY = frameY + 8 * SCALE
        const innerSize = QR_FRAME - 16 * SCALE
        roundRect(innerX, innerY, innerSize, innerSize, 6 * SCALE)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // Draw the QR canvas onto output
        const qrOffsetX = innerX + (innerSize - QR_SIZE) / 2
        const qrOffsetY = innerY + (innerSize - QR_SIZE) / 2
        ctx.drawImage(qrCanvas, qrOffsetX, qrOffsetY, QR_SIZE, QR_SIZE)

        // Orange corner brackets
        const brSize = 14 * SCALE
        const brThick = 2 * SCALE
        ctx.strokeStyle = '#e8874a'
        ctx.lineWidth = brThick
        const corners = [
            // TL
            [[frameX, frameY + brSize], [frameX, frameY], [frameX + brSize, frameY]],
            // TR
            [[frameX + QR_FRAME - brSize, frameY], [frameX + QR_FRAME, frameY], [frameX + QR_FRAME, frameY + brSize]],
            // BL
            [[frameX, frameY + QR_FRAME - brSize], [frameX, frameY + QR_FRAME], [frameX + brSize, frameY + QR_FRAME]],
            // BR
            [[frameX + QR_FRAME - brSize, frameY + QR_FRAME], [frameX + QR_FRAME, frameY + QR_FRAME], [frameX + QR_FRAME, frameY + QR_FRAME - brSize]]
        ]
        corners.forEach(([start, mid, end]) => {
            ctx.beginPath()
            ctx.moveTo(...start)
            ctx.lineTo(...mid)
            ctx.lineTo(...end)
            ctx.stroke()
        })

        // Center logo overlay on QR
        const centerLogoSize = 44 * SCALE
        const centerLogoX = W / 2 - centerLogoSize / 2
        const centerLogoY = frameY + QR_FRAME / 2 - centerLogoSize / 2
        ctx.save()
        ctx.beginPath()
        ctx.arc(centerLogoX + centerLogoSize / 2, centerLogoY + centerLogoSize / 2, centerLogoSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.clip()
        if (logo) ctx.drawImage(logo, centerLogoX, centerLogoY, centerLogoSize, centerLogoSize)
        ctx.restore()

        // ── Footer ────────────────────────────────────────────────────────────
        y = frameY + QR_FRAME + 20 * SCALE

        // Divider
        ctx.strokeStyle = '#2a2a2a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PADDING, y)
        ctx.lineTo(W - PADDING, y)
        ctx.stroke()

        y += 12 * SCALE

        // URL pill background
        const pillH = 28 * SCALE
        roundRect(PADDING, y, W - PADDING * 2, pillH, pillH / 2)
        ctx.fillStyle = '#1e1e1e'
        ctx.fill()
        ctx.strokeStyle = '#2a2a2a'
        ctx.lineWidth = 1
        ctx.stroke()

        // Orange dot
        ctx.beginPath()
        ctx.arc(PADDING + 14 * SCALE, y + pillH / 2, 3 * SCALE, 0, Math.PI * 2)
        ctx.fillStyle = '#e8874a'
        ctx.fill()

        // Artwork title in pill
        ctx.font = `${10 * SCALE}px sans-serif`
        ctx.fillStyle = '#9a8f8a'
        ctx.fillText(currentArtworkTitle, PADDING + 24 * SCALE, y + pillH / 2 + 4 * SCALE)

        // "Scan to view artwork"
        y += pillH + 10 * SCALE
        ctx.font = `bold ${7 * SCALE}px sans-serif`
        ctx.fillStyle = '#e8874a'
        ctx.globalAlpha = 0.7
        ctx.letterSpacing = `${2 * SCALE}px`
        const scanText = 'SCAN TO VIEW ARTWORK'
        const scanW = ctx.measureText(scanText).width
        ctx.fillText(scanText, (W - scanW) / 2, y + 8 * SCALE)
        ctx.globalAlpha = 1
        ctx.letterSpacing = '0px'

        // ── Download ──────────────────────────────────────────────────────────
        out.toBlob(blob => {
            if (!blob) return
            const safeTitle = currentArtworkTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, '-') || 'artwork'
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `iMAGE-${safeTitle}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }, 'image/png')

    } catch (error) {
        console.error('[QR download] Failed:', error)
        alert('Download failed. Please try again.')
    } finally {
        if (downloadBtn) downloadBtn.disabled = false
        if (btnLabel) btnLabel.textContent = originalLabel
    }
}

// Make showQRModal globally available
window.showQRModal = (docId, artworkTitle) => showQRModal(docId, artworkTitle)



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