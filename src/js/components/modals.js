import { formatDate, getArtworkMediaUrls, isVideoUrl, toArray } from "../utils/media.js";
import { buildArtworkShareUrl } from "../utils/url.js";

let modalCallbacks = {
  onFilterCategory: () => {},
  onFilterArtist: () => {},
};

let mediaViewerState = {
  urls: [],
  currentIndex: 0,
  touchStartX: null,
};

let currentArtworkTitle = "";

export function initModals(callbacks) {
  modalCallbacks = {
    ...modalCallbacks,
    ...callbacks,
  };

  const fullSheetOverlay = document.getElementById("fullSheetOverlay");
  const fullSheetClose = document.getElementById("fullSheetClose");
  fullSheetOverlay?.addEventListener("click", (event) => {
    if (event.target === fullSheetOverlay) closeFullSheet();
  });
  fullSheetClose?.addEventListener("click", closeFullSheet);

  const mediaViewerOverlay = document.getElementById("mediaViewerOverlay");
  const mediaViewerClose = document.getElementById("mediaViewerClose");
  const mediaViewerPrev = document.getElementById("mediaViewerPrev");
  const mediaViewerNext = document.getElementById("mediaViewerNext");
  const mediaViewerContainer = document.getElementById("mediaViewerContainer");

  mediaViewerClose?.addEventListener("click", closeMediaViewer);
  mediaViewerPrev?.addEventListener("click", () => navigateMedia("prev"));
  mediaViewerNext?.addEventListener("click", () => navigateMedia("next"));
  mediaViewerOverlay?.addEventListener("click", (event) => {
    if (event.target === mediaViewerOverlay) closeMediaViewer();
  });

  mediaViewerContainer?.addEventListener(
    "touchstart",
    (event) => {
      mediaViewerState.touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true },
  );

  mediaViewerContainer?.addEventListener(
    "touchend",
    (event) => {
      if (mediaViewerState.touchStartX === null) return;

      const delta = event.changedTouches[0].clientX - mediaViewerState.touchStartX;
      if (Math.abs(delta) >= 50) {
        delta < 0 ? navigateMedia("next") : navigateMedia("prev");
      }
      mediaViewerState.touchStartX = null;
    },
    { passive: true },
  );

  const qrModalOverlay = document.getElementById("qrModalOverlay");
  const qrModalClose = document.getElementById("qrModalClose");
  const qrDownloadButton = document.getElementById("qrDownloadBtn");

  qrModalOverlay?.addEventListener("click", (event) => {
    if (event.target === qrModalOverlay) closeQRModal();
  });
  qrModalClose?.addEventListener("click", closeQRModal);
  qrDownloadButton?.addEventListener("click", downloadQRCode);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (document.getElementById("fullSheet")?.classList.contains("scale-100")) {
      closeFullSheet();
    }

    if (document.getElementById("mediaViewerOverlay")?.classList.contains("opacity-100")) {
      closeMediaViewer();
    }
  });
}

export function openFullSheet(artwork) {
  const overlay = document.getElementById("fullSheetOverlay");
  const sheet = document.getElementById("fullSheet");

  document.getElementById("fullSheetTitle").textContent = artwork.title || "";

  const categoryElement = document.getElementById("fullSheetCategory");
  categoryElement.textContent = artwork.category || "";
  categoryElement.style.cursor = "pointer";
  categoryElement.onclick = () => {
    closeFullSheet();
    setTimeout(() => modalCallbacks.onFilterCategory(artwork.category), 300);
  };

  document.getElementById("fullSheetDate").textContent = formatDate(artwork.date);

  const fullContentWrap = document.getElementById("fullSheetFullContentWrap");
  const fullContentElement = document.getElementById("fullSheetFullContent");
  if (artwork.fullcontext && artwork.fullcontext.trim()) {
    fullContentElement.textContent = artwork.fullcontext;
    fullContentWrap.classList.remove("hidden");
  } else {
    fullContentWrap.classList.add("hidden");
  }

  const mediaWrap = document.getElementById("fullSheetMedia");
  const imageElement = document.getElementById("fullSheetImage");
  const videoElement = document.getElementById("fullSheetVideo");
  const mediaUrls = getArtworkMediaUrls(artwork);

  if (mediaUrls.length > 0) {
    const firstUrl = mediaUrls[0];
    if (isVideoUrl(firstUrl)) {
      imageElement.classList.add("hidden");
      videoElement.classList.remove("hidden");
      videoElement.src = firstUrl;
    } else {
      videoElement.classList.add("hidden");
      imageElement.classList.remove("hidden");
      imageElement.src = firstUrl;
      imageElement.alt = artwork.title || "";
    }

    mediaWrap.classList.remove("hidden");
    mediaWrap.style.cursor = "pointer";
    mediaWrap.onclick = () => openMediaViewer(mediaUrls, 0);
  } else {
    mediaWrap.classList.add("hidden");
  }

  const artistsContainer = document.getElementById("fullSheetArtists");
  artistsContainer.innerHTML = "";

  [
    { label: "Graphic Artist", key: "graphicartist" },
    { label: "Writer", key: "writer" },
    { label: "Videographer", key: "videographer" },
    { label: "Photographer", key: "photographer" },
  ].forEach((role) => {
    const artists = toArray(artwork.artists?.[role.key]);
    if (artists.length === 0) return;

    const artistCard = document.createElement("div");
    artistCard.className = "bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2";
    artistCard.innerHTML = `
      <p class="text-[9px] font-syne font-bold uppercase text-[#6b6460] mb-1">${role.label}</p>
      <div class="flex flex-col gap-1">
        ${artists
          .map(
            (name) => `
              <div class="flex items-start gap-1.5">
                <span class="text-[#e8874a]/60 shrink-0 mt-0.5">•</span>
                <button type="button" data-artist="${name}" class="text-sm font-outfit text-[#e8874a] break-words text-left cursor-pointer hover:underline underline-offset-4 decoration-[#e8874a] bg-transparent border-none p-0">${name}</button>
              </div>
            `,
          )
          .join("")}
      </div>
    `;

    artistCard.querySelectorAll("button[data-artist]").forEach((button) => {
      button.addEventListener("click", () => {
        closeFullSheet();
        setTimeout(() => modalCallbacks.onFilterArtist(button.dataset.artist), 300);
      });
    });

    artistsContainer.appendChild(artistCard);
  });

  overlay.classList.remove("pointer-events-none");
  requestAnimationFrame(() => {
    overlay.classList.remove("opacity-0");
    overlay.classList.add("opacity-100");
    sheet.classList.remove("scale-95", "opacity-0");
    sheet.classList.add("scale-100", "opacity-100");
  });
}

export function closeFullSheet() {
  const overlay = document.getElementById("fullSheetOverlay");
  const sheet = document.getElementById("fullSheet");

  overlay.classList.remove("opacity-100");
  overlay.classList.add("opacity-0");
  sheet.classList.remove("scale-100", "opacity-100");
  sheet.classList.add("scale-95", "opacity-0");

  setTimeout(() => overlay.classList.add("pointer-events-none"), 300);
}

function preloadMedia(url) {
  return new Promise((resolve, reject) => {
    if (isVideoUrl(url)) {
      resolve();
      return;
    }

    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject();
    image.src = url;
  });
}

function prefetchAdjacentMedia(index, urls) {
  if (urls.length <= 1) return;

  const nextIndex = (index + 1) % urls.length;
  const previousIndex = (index - 1 + urls.length) % urls.length;
  preloadMedia(urls[nextIndex]).catch(() => {});
  preloadMedia(urls[previousIndex]).catch(() => {});
}

function showMediaInViewer(index) {
  const url = mediaViewerState.urls[index];
  const imageElement = document.getElementById("mediaViewerImage");
  const videoElement = document.getElementById("mediaViewerVideo");
  const counter = document.getElementById("mediaViewerCounter");

  counter.textContent = `${index + 1} / ${mediaViewerState.urls.length}`;

  if (isVideoUrl(url)) {
    imageElement.classList.add("hidden");
    videoElement.classList.remove("hidden");
    videoElement.src = url;
  } else {
    videoElement.classList.add("hidden");
    imageElement.classList.remove("hidden");
    imageElement.src = url;
  }

  prefetchAdjacentMedia(index, mediaViewerState.urls);
}

function updateMediaNavigationButtons() {
  const previousButton = document.getElementById("mediaViewerPrev");
  const nextButton = document.getElementById("mediaViewerNext");
  const hasMultipleItems = mediaViewerState.urls.length > 1;

  previousButton?.classList.toggle("opacity-0", !hasMultipleItems);
  previousButton?.classList.toggle("pointer-events-none", !hasMultipleItems);
  nextButton?.classList.toggle("opacity-0", !hasMultipleItems);
  nextButton?.classList.toggle("pointer-events-none", !hasMultipleItems);
}

export function openMediaViewer(urls, startIndex) {
  mediaViewerState.urls = urls;
  mediaViewerState.currentIndex = startIndex;

  const overlay = document.getElementById("mediaViewerOverlay");
  const targetUrl = urls[startIndex];

  if (document.getElementById("fullSheetOverlay")?.classList.contains("opacity-100")) {
    closeFullSheet();
  }

  preloadMedia(targetUrl)
    .then(() => {
      showMediaInViewer(startIndex);
      updateMediaNavigationButtons();

      overlay.classList.remove("pointer-events-none");
      requestAnimationFrame(() => {
        overlay.classList.remove("opacity-0");
        overlay.classList.add("opacity-100");
      });
    })
    .catch(() => {
      alert("Failed to load media");
    });
}

function closeMediaViewer() {
  const overlay = document.getElementById("mediaViewerOverlay");
  const videoElement = document.getElementById("mediaViewerVideo");

  videoElement.pause();
  videoElement.src = "";

  overlay.classList.remove("opacity-100");
  overlay.classList.add("opacity-0");

  setTimeout(() => overlay.classList.add("pointer-events-none"), 300);
}

function navigateMedia(direction) {
  const videoElement = document.getElementById("mediaViewerVideo");
  if (!videoElement.classList.contains("hidden")) {
    videoElement.pause();
  }

  const nextIndex =
    direction === "next"
      ? (mediaViewerState.currentIndex + 1) % mediaViewerState.urls.length
      : (mediaViewerState.currentIndex - 1 + mediaViewerState.urls.length) %
        mediaViewerState.urls.length;

  mediaViewerState.currentIndex = nextIndex;
  showMediaInViewer(nextIndex);
}

export function showQRModal(docId, artworkTitle) {
  currentArtworkTitle = artworkTitle || "Artwork";

  const qrCreator = window.QrCreator;
  if (!qrCreator) {
    alert("QR Code library not loaded. Please refresh the page.");
    return;
  }

  const overlay = document.getElementById("qrModalOverlay");
  const canvas = document.getElementById("qrCanvas");
  const domainElement = document.getElementById("qrDomain");

  if (!overlay || !canvas || !domainElement) {
    alert("Modal elements not found");
    return;
  }

  const shareUrl = buildArtworkShareUrl(window.location.href, docId);
  domainElement.textContent = currentArtworkTitle;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  try {
    qrCreator.render(
      {
        text: shareUrl,
        radius: 0,
        ecLevel: "M",
        fill: "#C0451A",
        background: "#ffffff",
        size: 252,
      },
      canvas,
    );

    overlay.classList.remove("pointer-events-none");
    requestAnimationFrame(() => {
      overlay.classList.remove("opacity-0");
      overlay.classList.add("opacity-100");
    });
  } catch (error) {
    console.error("QR generation failed:", error);
    alert(`Failed to generate QR code${error?.message ? `: ${error.message}` : ""}`);
  }
}

function closeQRModal() {
  const overlay = document.getElementById("qrModalOverlay");
  overlay.classList.remove("opacity-100");
  overlay.classList.add("opacity-0");
  setTimeout(() => overlay.classList.add("pointer-events-none"), 300);
}

async function downloadQRCode() {
  const downloadButton = document.getElementById("qrDownloadBtn");
  const label = downloadButton?.querySelector("span");
  const originalLabel = label?.textContent;

  if (downloadButton) downloadButton.disabled = true;
  if (label) label.textContent = "Saving...";

  try {
    const qrCanvas = document.getElementById("qrCanvas");
    const logoImage = document.querySelector("#qrCard img");
    const scale = 2;
    const width = 360 * scale;
    const padding = 20 * scale;
    const qrSize = 252 * scale;
    const qrFrame = 268 * scale;
    const radius = 16 * scale;
    const topBar = 3 * scale;
    const headerHeight = 72 * scale;
    const labelHeight = 36 * scale;
    const qrSectionHeight = qrFrame + 24 * scale;
    const footerHeight = 80 * scale;
    const height = topBar + headerHeight + labelHeight + qrSectionHeight + footerHeight;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = width;
    outputCanvas.height = height;
    const context = outputCanvas.getContext("2d");

    function roundRect(x, y, boxWidth, boxHeight, boxRadius) {
      context.beginPath();
      context.moveTo(x + boxRadius, y);
      context.lineTo(x + boxWidth - boxRadius, y);
      context.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + boxRadius);
      context.lineTo(x + boxWidth, y + boxHeight - boxRadius);
      context.quadraticCurveTo(
        x + boxWidth,
        y + boxHeight,
        x + boxWidth - boxRadius,
        y + boxHeight,
      );
      context.lineTo(x + boxRadius, y + boxHeight);
      context.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - boxRadius);
      context.lineTo(x, y + boxRadius);
      context.quadraticCurveTo(x, y, x + boxRadius, y);
      context.closePath();
    }

    function loadImage(source) {
      return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
      });
    }

    roundRect(0, 0, width, height, radius);
    context.fillStyle = "#141414";
    context.fill();

    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#e8874a");
    gradient.addColorStop(1, "#c0451a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, topBar);

    let y = topBar + 20 * scale;
    const logo = await loadImage(logoImage?.src || "../imgs/image_logo.jpg");
    const logoSize = 38 * scale;
    const logoX = padding;
    const logoY = y;

    context.save();
    context.beginPath();
    context.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    context.strokeStyle = "#e8874a";
    context.lineWidth = 1 * scale;
    context.stroke();
    context.clip();
    if (logo) context.drawImage(logo, logoX, logoY, logoSize, logoSize);
    context.restore();

    const textX = logoX + logoSize + 12 * scale;
    context.font = `italic ${22 * scale}px serif`;
    context.fillStyle = "#e8874a";
    context.fillText("i", textX, logoY + 22 * scale);
    const iWidth = context.measureText("i").width;
    context.fillStyle = "#e2d9cf";
    context.fillText("MAGE", textX + iWidth, logoY + 22 * scale);

    context.font = `bold ${7 * scale}px sans-serif`;
    context.fillStyle = "#6b6460";
    context.fillText("CVSU CARMONA · ARTWORK GALLERY", textX, logoY + 36 * scale);

    y = topBar + headerHeight;
    context.strokeStyle = "#2a2a2a";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();

    y += 16 * scale;
    context.font = `bold ${7 * scale}px sans-serif`;
    context.fillStyle = "#6b6460";
    context.fillText("ARTWORK QR CODE", padding, y + 8 * scale);

    y += labelHeight;
    const frameX = (width - qrFrame) / 2;
    const frameY = y;
    const innerX = frameX + 8 * scale;
    const innerY = frameY + 8 * scale;
    const innerSize = qrFrame - 16 * scale;

    roundRect(innerX, innerY, innerSize, innerSize, 6 * scale);
    context.fillStyle = "#ffffff";
    context.fill();

    const qrOffsetX = innerX + (innerSize - qrSize) / 2;
    const qrOffsetY = innerY + (innerSize - qrSize) / 2;
    context.drawImage(qrCanvas, qrOffsetX, qrOffsetY, qrSize, qrSize);

    const bracketSize = 14 * scale;
    context.strokeStyle = "#e8874a";
    context.lineWidth = 2 * scale;
    [
      [[frameX, frameY + bracketSize], [frameX, frameY], [frameX + bracketSize, frameY]],
      [
        [frameX + qrFrame - bracketSize, frameY],
        [frameX + qrFrame, frameY],
        [frameX + qrFrame, frameY + bracketSize],
      ],
      [
        [frameX, frameY + qrFrame - bracketSize],
        [frameX, frameY + qrFrame],
        [frameX + bracketSize, frameY + qrFrame],
      ],
      [
        [frameX + qrFrame - bracketSize, frameY + qrFrame],
        [frameX + qrFrame, frameY + qrFrame],
        [frameX + qrFrame, frameY + qrFrame - bracketSize],
      ],
    ].forEach(([start, mid, end]) => {
      context.beginPath();
      context.moveTo(...start);
      context.lineTo(...mid);
      context.lineTo(...end);
      context.stroke();
    });

    const centerLogoSize = 44 * scale;
    const centerLogoX = width / 2 - centerLogoSize / 2;
    const centerLogoY = frameY + qrFrame / 2 - centerLogoSize / 2;
    context.save();
    context.beginPath();
    context.arc(
      centerLogoX + centerLogoSize / 2,
      centerLogoY + centerLogoSize / 2,
      centerLogoSize / 2,
      0,
      Math.PI * 2,
    );
    context.fillStyle = "#ffffff";
    context.fill();
    context.clip();
    if (logo) {
      context.drawImage(logo, centerLogoX, centerLogoY, centerLogoSize, centerLogoSize);
    }
    context.restore();

    y = frameY + qrFrame + 20 * scale;
    context.strokeStyle = "#2a2a2a";
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();

    y += 12 * scale;
    const pillHeight = 28 * scale;
    roundRect(padding, y, width - padding * 2, pillHeight, pillHeight / 2);
    context.fillStyle = "#1e1e1e";
    context.fill();
    context.strokeStyle = "#2a2a2a";
    context.stroke();

    context.beginPath();
    context.arc(padding + 14 * scale, y + pillHeight / 2, 3 * scale, 0, Math.PI * 2);
    context.fillStyle = "#e8874a";
    context.fill();

    context.font = `${10 * scale}px sans-serif`;
    context.fillStyle = "#9a8f8a";
    context.fillText(currentArtworkTitle, padding + 24 * scale, y + pillHeight / 2 + 4 * scale);

    y += pillHeight + 10 * scale;
    const scanText = "SCAN TO VIEW ARTWORK";
    context.font = `bold ${7 * scale}px sans-serif`;
    context.fillStyle = "#e8874a";
    const scanWidth = context.measureText(scanText).width;
    context.fillText(scanText, (width - scanWidth) / 2, y + 8 * scale);

    outputCanvas.toBlob((blob) => {
      if (!blob) return;

      const safeTitle =
        currentArtworkTitle.replace(/[^a-zA-Z0-9\s-_]/g, "").trim().replace(/\s+/g, "-") ||
        "artwork";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `iMAGE-${safeTitle}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (error) {
    console.error("[QR download] Failed:", error);
    alert("Download failed. Please try again.");
  } finally {
    if (downloadButton) downloadButton.disabled = false;
    if (label) label.textContent = originalLabel;
  }
}
