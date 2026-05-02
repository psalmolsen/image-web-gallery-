import { auth } from "../services/firebase.js";
import { deleteArtwork } from "../services/artworks.js";
import { isVideoUrl, formatDate, getArtworkMediaUrls, toArray } from "../utils/media.js";
import { buildArtworkShareUrl, buildPageUrl } from "../utils/url.js";
import { openFullSheet, openMediaViewer, showQRModal } from "./modals.js";

let activeCardDropdown = null;
let activeShareDropdown = null;

// TODO: sessionStorage auth has been replaced with Firebase Email Link Auth
function isPublisher() {
  return auth.currentUser !== null;
}

function setupMedia(card, imageUrls, title) {
  const totalItems = imageUrls.length;
  if (totalItems === 0) return;

  const imageWrap = card.querySelector(".card-image-wrap");
  const imageEl = card.querySelector(".card-image");
  const videoEl = card.querySelector(".card-video");
  const imageCount = card.querySelector(".card-image-count");
  const dotsWrap = card.querySelector(".card-image-dots");
  const prevBtn = card.querySelector(".card-prev");
  const nextBtn = card.querySelector(".card-next");

  let currentIndex = 0;
  let touchStartX = null;
  let isAnimating = false;

  imageWrap.classList.remove("hidden");

  imageUrls.forEach((url) => {
    if (!isVideoUrl(url)) {
      const preloadImage = new Image();
      preloadImage.src = url;
    }
  });

  function renderMedia(index) {
    const url = imageUrls[index];
    imageCount.textContent = `${index + 1} / ${totalItems}`;

    Array.from(dotsWrap.children).forEach((dot, dotIndex) => {
      dot.className = `h-1.5 w-1.5 rounded-full ${dotIndex === index ? "bg-white/95" : "bg-white/45"}`;
    });

    if (isVideoUrl(url)) {
      imageEl.classList.add("hidden");
      videoEl.classList.remove("hidden");
      videoEl.src = url;
      return;
    }

    videoEl.classList.add("hidden");
    imageEl.classList.remove("hidden");
    imageEl.src = url;
    imageEl.alt = title;
  }

  function bindOpenMedia(element, index) {
    element.style.cursor = "pointer";
    element.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMediaViewer(imageUrls, index);
    };
  }

  bindOpenMedia(imageEl, currentIndex);
  bindOpenMedia(videoEl, currentIndex);

  if (totalItems > 1) {
    imageCount.classList.remove("hidden");
    dotsWrap.classList.remove("hidden");
    prevBtn.classList.remove("opacity-0", "pointer-events-none");
    nextBtn.classList.remove("opacity-0", "pointer-events-none");

    dotsWrap.innerHTML = "";
    for (let index = 0; index < totalItems; index += 1) {
      const dot = document.createElement("span");
      dot.className = "h-1.5 w-1.5 rounded-full bg-white/45";
      dotsWrap.appendChild(dot);
    }

    function getActiveElement() {
      return isVideoUrl(imageUrls[currentIndex]) ? videoEl : imageEl;
    }

    function animateToIndex(nextIndex, direction) {
      if (isAnimating || nextIndex === currentIndex) return;

      isAnimating = true;
      const outX = direction === "next" ? "-16%" : "16%";
      const inX = direction === "next" ? "16%" : "-16%";

      getActiveElement()
        .animate(
          [
            { transform: "translateX(0)", opacity: 1 },
            { transform: `translateX(${outX})`, opacity: 0.25 },
          ],
          { duration: 180, easing: "ease-out", fill: "forwards" },
        )
        .onfinish = () => {
          currentIndex = nextIndex;
          renderMedia(currentIndex);
          bindOpenMedia(imageEl, currentIndex);
          bindOpenMedia(videoEl, currentIndex);

          getActiveElement()
            .animate(
              [
                { transform: `translateX(${inX})`, opacity: 0.25 },
                { transform: "translateX(0)", opacity: 1 },
              ],
              { duration: 220, easing: "ease-out", fill: "forwards" },
            )
            .onfinish = () => {
              isAnimating = false;
            };
        };
    }

    const goNext = () => animateToIndex((currentIndex + 1) % totalItems, "next");
    const goPrev = () => animateToIndex((currentIndex - 1 + totalItems) % totalItems, "prev");

    nextBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goNext();
    });

    prevBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      goPrev();
    });

    imageWrap.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0].clientX;
      },
      { passive: true },
    );

    imageWrap.addEventListener(
      "touchend",
      (event) => {
        if (touchStartX === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) >= 40) {
          delta < 0 ? goNext() : goPrev();
        }
        touchStartX = null;
      },
      { passive: true },
    );
  }

  renderMedia(0);
}

function setupArtists(card, artists, onArtistClick) {
  const container = card.querySelector(".card-artists");
  const roles = [
    { label: "Graphic Artist", value: toArray(artists?.graphicartist) },
    { label: "Writer", value: toArray(artists?.writer) },
    { label: "Videographer", value: toArray(artists?.videographer) },
    { label: "Photographer", value: toArray(artists?.photographer) },
  ].filter((role) => role.value.length > 0);

  roles.forEach((role) => {
    const pill = document.createElement("div");
    pill.className = "px-4 py-1 flex flex-col gap-1";

    const label = document.createElement("span");
    label.className = "text-xs font-bold font-syne text-[#6b6460] uppercase tracking-wider";
    label.textContent = `${role.label}:`;

    const namesWrap = document.createElement("div");
    namesWrap.className = "flex flex-col gap-1";

    role.value.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "text-sm font-normal text-[#e8874a] font-outfit pl-2 text-left cursor-pointer hover:underline underline-offset-4 decoration-[#e8874a] break-words flex items-start gap-1.5";
      button.title = `View artworks by ${name}`;
      button.innerHTML = `<span class="text-[#e8874a]/60 shrink-0 mt-0.5">&bull;</span><span>${name}</span>`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onArtistClick(name);
      });
      namesWrap.appendChild(button);
    });

    pill.append(label, namesWrap);
    container.appendChild(pill);
  });
}

function openDropdown(dropdown) {
  dropdown.classList.remove("hidden");
  requestAnimationFrame(() => {
    dropdown.classList.add("opacity-100", "translate-y-0", "scale-100");
    dropdown.classList.remove("opacity-0", "-translate-y-1", "scale-95");
  });
}

function closeDropdown(dropdown) {
  dropdown.classList.add("opacity-0", "-translate-y-1", "scale-95");
  dropdown.classList.remove("opacity-100", "translate-y-0", "scale-100");
  setTimeout(() => dropdown.classList.add("hidden"), 200);
}

function bindCardMenu(cardElement, docId, onDelete, currentHref) {
  const menuButton = cardElement.querySelector(".card-menu");
  const dropdown = cardElement.querySelector(".card-dropdown");
  const editButton = cardElement.querySelector(".card-edit");
  const deleteButton = cardElement.querySelector(".card-delete");

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (activeCardDropdown && activeCardDropdown !== dropdown) {
      activeCardDropdown.classList.add("hidden");
    }

    dropdown.classList.toggle("hidden");
    activeCardDropdown = dropdown.classList.contains("hidden") ? null : dropdown;
  });

  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    dropdown.classList.add("hidden");
    activeCardDropdown = null;
    window.location.href = buildPageUrl(currentHref, "posting.html", { id: docId });
  });

  deleteButton.addEventListener("click", async (event) => {
    event.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this artwork?")) return;

    try {
      await deleteArtwork(docId);
      onDelete(docId);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete artwork. Please refresh and try again.");
    }
  });
}

function bindShareActions(cardElement, docId, artworkTitle, currentHref, showCopyToast) {
  const shareButton = cardElement.querySelector(".card-share");
  const shareDropdown = cardElement.querySelector(".share-dropdown");
  const imageCodeButton = cardElement.querySelector(".image-code");
  const copyLinkButton = cardElement.querySelector(".copy-link");
  const shareUrl = buildArtworkShareUrl(currentHref, docId);

  shareButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (window.innerWidth < 768) {
      window.dispatchEvent(
        new CustomEvent("image:open-share-sheet", {
          detail: { shareUrl, docId, artworkTitle },
        }),
      );
      return;
    }

    if (activeShareDropdown && activeShareDropdown !== shareDropdown) {
      closeDropdown(activeShareDropdown);
    }

    if (shareDropdown.classList.contains("hidden")) {
      openDropdown(shareDropdown);
      activeShareDropdown = shareDropdown;
      return;
    }

    closeDropdown(shareDropdown);
    activeShareDropdown = null;
  });

  imageCodeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeDropdown(shareDropdown);
    activeShareDropdown = null;
    showQRModal(docId, artworkTitle);
  });

  copyLinkButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    closeDropdown(shareDropdown);
    activeShareDropdown = null;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopyToast();
    } catch (error) {
      console.error(error);
    }
  });
}

export function createCard(artwork, options) {
  const {
    currentHref,
    isPublisher: canManageArtwork = isPublisher(),
    onDelete,
    onCategoryClick,
    onArtistClick,
    showCopyToast,
  } = options;

  const cardTemplate = document.querySelector("#cardTemplate");
  const fragment = cardTemplate.content.cloneNode(true);
  const cardElement = fragment.firstElementChild;

  cardElement.querySelector(".card-title").textContent = artwork.title;
  cardElement.querySelector(".card-date").textContent = formatDate(artwork.date);

  const categoryButton = cardElement.querySelector(".card-category");
  categoryButton.textContent = artwork.category;
  categoryButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onCategoryClick(artwork.category);
  });

  const cardLink = cardElement.querySelector(".card-link");
  cardLink.href = buildPageUrl(currentHref, "dashboard.html", { artwork: artwork.id });
  cardLink.addEventListener("click", (event) => {
    event.preventDefault();
    openFullSheet(artwork);
  });

  const overviewElement = cardElement.querySelector(".card-overview");
  const toggleButton = cardElement.querySelector(".card-overview-toggle");
  overviewElement.textContent = artwork.overview || "";

  function applyClamp(isExpanded) {
    if (isExpanded) {
      overviewElement.style.display = "block";
      overviewElement.style.overflow = "visible";
      overviewElement.style.webkitLineClamp = "unset";
      toggleButton.textContent = "less";
      return;
    }

    overviewElement.style.display = "-webkit-box";
    overviewElement.style.webkitBoxOrient = "vertical";
    overviewElement.style.webkitLineClamp = "3";
    overviewElement.style.overflow = "hidden";
    toggleButton.textContent = "... more";
  }

  function initOverviewToggle() {
    let expanded = false;
    applyClamp(false);

    const isOverflow = overviewElement.scrollHeight > overviewElement.clientHeight + 1;
    if (!isOverflow) {
      toggleButton.classList.add("hidden");
      return;
    }

    toggleButton.classList.remove("hidden");
    toggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      expanded = !expanded;
      applyClamp(expanded);
    });
  }

  setupMedia(cardElement, getArtworkMediaUrls(artwork), artwork.title);
  setupArtists(cardElement, artwork.artists, onArtistClick);

  if (canManageArtwork) {
    bindCardMenu(cardElement, artwork.id, onDelete, currentHref);
  } else {
    const menuButton = cardElement.querySelector(".card-menu");
    if (menuButton) menuButton.style.display = "none";
  }

  bindShareActions(cardElement, artwork.id, artwork.title, currentHref, showCopyToast);

  return {
    card: cardElement,
    init: initOverviewToggle,
  };
}

export function closeAllDropdowns() {
  if (activeShareDropdown) {
    closeDropdown(activeShareDropdown);
    activeShareDropdown = null;
  }

  if (activeCardDropdown) {
    activeCardDropdown.classList.add("hidden");
    activeCardDropdown = null;
  }
}
