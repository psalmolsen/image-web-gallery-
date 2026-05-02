import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { createCard, closeAllDropdowns } from "../components/card.js";
import { initModals, openFullSheet, showQRModal } from "../components/modals.js";
import { auth } from "../services/firebase.js";
import { fetchAllArtworks, fetchArtworkById, fetchArtworkPage } from "../services/artworks.js";
import { isPublisher, signOut } from "../utils/auth.js";

const layout = document.getElementById("layout");
const emptyState = document.getElementById("emptyState");
const worksSection = document.getElementById("worksSection");
const aboutSection = document.getElementById("aboutSection");
const fab = document.querySelector(".fab");
const navWorksButtons = document.querySelectorAll('[data-nav-target="works"]');
const navAboutButtons = document.querySelectorAll('[data-nav-target="about"]');
const shareSheetOverlay = document.getElementById("shareSheetOverlay");
const shareSheet = document.getElementById("shareSheet");
const shareSheetCopy = document.getElementById("shareSheetCopy");
const shareSheetImageCode = document.getElementById("shareSheetImageCode");
const shareSheetClose = document.getElementById("shareSheetClose");
const signOutButton = document.getElementById("signOutBtn");

let currentView = "works";
let lastVisible = null;
let isLoading = false;
let hasMore = true;
let isSearching = false;
let allArtworks = [];
let filterCache = null;
let activeShareUrl = "";
let activeShareDocId = "";
let activeShareTitle = "";
let publisherMode = false;

// TODO: sessionStorage auth has been replaced with Firebase Email Link Auth
// TODO: Consider adding onAuthStateChanged listener to show a loading state
// while Firebase checks auth — prevents flash of wrong UI on page load
function showCopyToast() {
  const toast = document.getElementById("copyToast");
  if (!toast) return;

  toast.classList.remove("opacity-0", "pointer-events-none");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.add("opacity-0", "pointer-events-none");
    toast.classList.remove("opacity-100");
  }, 3000);
}

function updateNavStyles() {
  navWorksButtons.forEach((button) => {
    const active = currentView === "works";
    button.classList.toggle("text-orange-500", active);
    button.classList.toggle("text-stone-500", !active);
    if (button.classList.contains("border-b-2")) {
      button.classList.toggle("border-orange-500", active);
      button.classList.toggle("border-transparent", !active);
    }
    button.querySelectorAll("svg, span").forEach((element) => {
      element.classList.toggle("text-orange-500", active);
      element.classList.toggle("text-[#4a4a4a]", !active);
    });
  });

  navAboutButtons.forEach((button) => {
    const active = currentView === "about";
    button.classList.toggle("text-orange-500", active);
    button.classList.toggle("text-stone-500", !active);
    if (button.classList.contains("border-b-2")) {
      button.classList.toggle("border-orange-500", active);
      button.classList.toggle("border-transparent", !active);
    }
    button.querySelectorAll("svg, span").forEach((element) => {
      element.classList.toggle("text-orange-500", active);
      element.classList.toggle("text-[#4a4a4a]", !active);
    });
  });
}

function setFabVisibility(showWorks) {
  if (!fab) return;
  fab.style.setProperty("display", publisherMode && showWorks ? "flex" : "none", "important");
}

function setSignOutVisibility(show) {
  if (!signOutButton) return;
  signOutButton.style.setProperty("display", show ? "flex" : "none", "important");
}

function setActiveView(view) {
  currentView = view;
  const showWorks = view === "works";

  worksSection?.classList.toggle("hidden", !showWorks);
  aboutSection?.classList.toggle("hidden", showWorks);
  setFabVisibility(showWorks);
  updateNavStyles();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetEmptyState() {
  emptyState.classList.add("hidden");
  layout.innerHTML = `
    <div class="flex-1 flex flex-col gap-5" id="col-0"></div>
    <div class="hidden md:flex flex-1 flex-col gap-5" id="col-1"></div>
    <div class="hidden lg:flex flex-1 flex-col gap-5" id="col-2"></div>
  `;
}

function renderCards(artworks) {
  resetEmptyState();

  const columns = [
    document.getElementById("col-0"),
    document.getElementById("col-1"),
    document.getElementById("col-2"),
  ];
  const columnCount = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;

  artworks.forEach((artwork, index) => {
    const { card, init } = createCard(artwork, {
      currentHref: window.location.href,
      isPublisher: publisherMode,
      onDelete: handleDelete,
      onCategoryClick: filterByCategory,
      onArtistClick: filterByArtist,
      showCopyToast,
    });

    columns[index % columnCount].appendChild(card);
    init();
  });
}

function showNoResults() {
  layout.innerHTML = "";
  emptyState.classList.remove("hidden");
}

function updateBannerVisibility({ category = null, artist = null, count = 0 }) {
  const bannerContent = document.getElementById("bannerContent");
  const categoryBanner = document.getElementById("categoryBanner");
  const artistBanner = document.getElementById("artistBanner");

  if (!category && !artist) {
    bannerContent.classList.remove("hidden");
    categoryBanner.classList.add("hidden");
    artistBanner.classList.add("hidden");
    return;
  }

  bannerContent.classList.add("hidden");
  categoryBanner.classList.toggle("hidden", !category);
  artistBanner.classList.toggle("hidden", !artist);

  if (category) {
    document.getElementById("categoryName").textContent = category;
    document.getElementById("artworkCount").textContent = count;
  }

  if (artist) {
    document.getElementById("artistName").textContent = artist;
    document.getElementById("artistCount").textContent = count;
  }
}

async function getFilterCache() {
  if (!filterCache) {
    filterCache = await fetchAllArtworks();
  }
  return filterCache;
}

async function filterByCategory(category) {
  isSearching = true;
  const artworks = (await getFilterCache()).filter((artwork) => artwork.category === category);

  setActiveView("works");
  updateBannerVisibility({ category, count: artworks.length });

  if (artworks.length === 0) {
    showNoResults();
    return;
  }

  renderCards(artworks);
}

async function filterByArtist(artistName) {
  isSearching = true;
  const trimmedName = artistName.trim();
  const artworks = (await getFilterCache()).filter((artwork) =>
    Object.values(artwork.artists || {})
      .flat()
      .some((name) => name.trim() === trimmedName),
  );

  setActiveView("works");
  updateBannerVisibility({ artist: artistName, count: artworks.length });

  if (artworks.length === 0) {
    showNoResults();
    return;
  }

  renderCards(artworks);
}

async function filterArtworks(searchQuery) {
  isSearching = true;
  const artworks = (await getFilterCache()).filter((artwork) => {
    const artistText = Object.values(artwork.artists || {}).flat().join(" ").toLowerCase();
    return (
      artwork.title.toLowerCase().includes(searchQuery) ||
      artwork.category.toLowerCase().includes(searchQuery) ||
      artistText.includes(searchQuery)
    );
  });

  setActiveView("works");
  updateBannerVisibility({});

  if (artworks.length === 0) {
    showNoResults();
    return;
  }

  renderCards(artworks);
}

function restoreDefaultGallery() {
  setActiveView("works");
  isSearching = false;
  updateBannerVisibility({});
  renderCards(allArtworks);
}

function bindSearch(input) {
  if (!input) return;

  input.addEventListener("keydown", async (event) => {
    if (!["Enter", "Go", "Search"].includes(event.key)) return;
    event.preventDefault();

    const query = input.value.trim().toLowerCase();
    if (query) {
      await filterArtworks(query);
      return;
    }

    restoreDefaultGallery();
  });

  input.addEventListener("search", async () => {
    const query = input.value.trim().toLowerCase();
    if (query) {
      await filterArtworks(query);
      return;
    }

    restoreDefaultGallery();
  });
}

async function performSearch(input) {
  const query = input?.value.trim().toLowerCase();
  if (query) {
    await filterArtworks(query);
    return;
  }

  restoreDefaultGallery();
}

async function loadMoreArtworks() {
  if (isLoading || !hasMore) return;
  isLoading = true;

  try {
    const result = await fetchArtworkPage(lastVisible, 6);
    lastVisible = result.lastVisible;
    hasMore = result.hasMore;

    if (result.artworks.length === 0) {
      if (allArtworks.length === 0) {
        showNoResults();
      }
      isLoading = false;
      return;
    }

    result.artworks.forEach((artwork) => {
      if (!allArtworks.find((entry) => entry.id === artwork.id)) {
        allArtworks.push(artwork);
      }
    });

    renderCards(allArtworks);
  } catch (error) {
    console.error("[dashboard] Failed to load artworks:", error);
    // TODO: Add error boundaries â€” if Firebase fails silently right now the whole page breaks with no user feedback
  } finally {
    isLoading = false;
  }
}

function openShareSheet({ shareUrl, docId, artworkTitle }) {
  activeShareUrl = shareUrl;
  activeShareDocId = docId;
  activeShareTitle = artworkTitle || "";
  shareSheetOverlay.classList.remove("pointer-events-none");
  requestAnimationFrame(() => {
    shareSheetOverlay.classList.remove("opacity-0");
    shareSheetOverlay.classList.add("opacity-100");
    shareSheet.classList.remove("translate-y-full");
    shareSheet.classList.add("translate-y-0");
  });
}

function closeShareSheet() {
  shareSheetOverlay.classList.remove("opacity-100");
  shareSheetOverlay.classList.add("opacity-0");
  shareSheet.classList.remove("translate-y-0");
  shareSheet.classList.add("translate-y-full");
  setTimeout(() => shareSheetOverlay.classList.add("pointer-events-none"), 300);
}

function handleDelete(deletedId) {
  allArtworks = allArtworks.filter((artwork) => artwork.id !== deletedId);
  if (filterCache) {
    filterCache = filterCache.filter((artwork) => artwork.id !== deletedId);
  }
  renderCards(allArtworks);
}

function bindShareSheet() {
  window.addEventListener("image:open-share-sheet", (event) => openShareSheet(event.detail));

  shareSheetOverlay?.addEventListener("click", closeShareSheet);
  shareSheetClose?.addEventListener("click", closeShareSheet);

  shareSheetCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      showCopyToast();
    } catch (error) {
      console.error(error);
    } finally {
      closeShareSheet();
    }
  });

  shareSheetImageCode?.addEventListener("click", () => {
    closeShareSheet();
    showQRModal(activeShareDocId, activeShareTitle);
  });
}

function bindNavigation() {
  navWorksButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView("works"));
  });

  navAboutButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView("about"));
  });

  updateNavStyles();
}

function bindResize() {
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!isSearching) {
        renderCards(allArtworks);
      }
    }, 250);
  });
}

function bindInfiniteScroll() {
  window.addEventListener("scroll", () => {
    if (isSearching) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
      loadMoreArtworks();
    }
  });
}

async function openArtworkFromUrl() {
  const artworkId = new URLSearchParams(window.location.search).get("artwork");
  if (!artworkId) return;

  const existingArtwork = allArtworks.find((artwork) => artwork.id === artworkId);
  if (existingArtwork) {
    openFullSheet(existingArtwork);
    return;
  }

  try {
    const artwork = await fetchArtworkById(artworkId);
    if (artwork) openFullSheet(artwork);
  } catch (error) {
    console.error("[dashboard] Failed to open artwork from URL:", error);
  }
}

document.addEventListener("click", () => closeAllDropdowns());

bindSearch(document.getElementById("searchInput"));
bindSearch(document.getElementById("searchInputMob"));
document.getElementById("searchBtn")?.addEventListener("click", () => {
  performSearch(document.getElementById("searchInput"));
});
document.getElementById("searchBtnMob")?.addEventListener("click", () => {
  performSearch(document.getElementById("searchInputMob"));
});

bindNavigation();
bindShareSheet();
bindResize();
bindInfiniteScroll();
initModals({
  onFilterCategory: filterByCategory,
  onFilterArtist: filterByArtist,
});

signOutButton?.addEventListener("click", async () => {
  await signOut(window.location.href);
});

await loadMoreArtworks();
await openArtworkFromUrl();

onAuthStateChanged(auth, async (user) => {
  publisherMode = !!user && (await isPublisher());
  setFabVisibility(currentView === "works");
  setSignOutVisibility(publisherMode);

  if (allArtworks.length > 0) {
    renderCards(allArtworks);
  }
});

//todo: see ful content artist colection not clicakble
//todo: image qr code
//todo: secure the site (no pop up ads etc.)
//todo: after development, uncheck the firebase development rules so that the database is secure and not all info fecthcing to the web
//todo: Warning: cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI: https://tailwindcss.com/docs/installation
//todo: dl qr code
//todo: qr on mobile
//todo: no artwork yet (create artwork) only on admin or publisher. not for viewwer only
