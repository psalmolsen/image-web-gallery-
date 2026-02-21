// ─────────────────────────────────────────────────────────────
//  Backend.js  –  iMAGE Artwork Gallery
//  Database : Supabase (post metadata)
//  Media    : Cloudinary (images & videos)
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  supabase: {
    url: "https://spgsieiobdkqclklchyy.supabase.co",
    anon: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZ3NpZWlvYmRrcWNsa2xjaHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzY3NjIsImV4cCI6MjA4NzE1Mjc2Mn0.B9UEB7Led34H3owPE4Qg-lo5lBhIQv64TzKuz-oLPLE",
  },
  cloudinary: {
    cloudName: "drfzsz1t6",
    uploadPreset: "image-gallery",
  },
};

// ─────────────────────────────────────────────────────────────
//  SUPABASE HELPERS
// ─────────────────────────────────────────────────────────────

async function dbInsert(artwork) {
  const res = await fetch(`${CONFIG.supabase.url}/rest/v1/artworks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": CONFIG.supabase.anon,
      "Authorization": `Bearer ${CONFIG.supabase.anon}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(artwork),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbFetch(search = "") {
  const res = await fetch(
    `${CONFIG.supabase.url}/rest/v1/artworks?order=published_at.desc`,
    {
      headers: {
        "apikey": CONFIG.supabase.anon,
        "Authorization": `Bearer ${CONFIG.supabase.anon}`,
      },
    }
  );
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter(
    (a) =>
      a.title?.toLowerCase().includes(q) ||
      a.overview?.toLowerCase().includes(q) ||
      Object.values(a.artists || {}).some((v) => v.toLowerCase().includes(q))
  );
}

// ─────────────────────────────────────────────────────────────
//  CLOUDINARY UPLOAD
// ─────────────────────────────────────────────────────────────

function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CONFIG.cloudinary.uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CONFIG.cloudinary.cloudName}/auto/upload`
    );

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.onload = () =>
      xhr.status === 200
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error(xhr.responseText));

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

// ─────────────────────────────────────────────────────────────
//  POSTING PAGE
// ─────────────────────────────────────────────────────────────

if (document.getElementById("publishBtn")) {

  // Show / hide Team Collaboration extra field
  const categorySelect = document.getElementById("category");
  const collabField = document.getElementById("collabField");

  categorySelect?.addEventListener("change", () => {
    collabField.classList.toggle(
      "hidden",
      categorySelect.value !== "team_collaboration"
    );
  });

  // Add collab as custom category option
  document.getElementById("add_collab_button")?.addEventListener("click", () => {
    const name = document.getElementById("collabName")?.value.trim();
    if (!name) { showToast("Please enter a collaboration name.", "error"); return; }

    for (let option of categorySelect.options) {
      if (option.value === name) {
        categorySelect.value = name;
        collabField.classList.add("hidden");
        document.getElementById("collabName").value = "";
        return;
      }
    }

    const newOption = document.createElement("option");
    newOption.value = name;
    newOption.text = name;
    categorySelect.insertBefore(newOption, categorySelect.options[categorySelect.options.length - 1]);
    categorySelect.value = name;
    collabField.classList.add("hidden");
    document.getElementById("collabName").value = "";
  });

  // Live file preview inside the upload box
  const fileInput = document.getElementById("FileInput");
  const uploadArea = document.getElementById("FIle")?.querySelector("label[for='FileInput']");

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file || !uploadArea) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    uploadArea.innerHTML = isVideo
      ? `<video src="${url}" class="w-full h-full object-cover rounded-2xl" muted loop autoplay playsinline></video>`
      : `<img src="${url}" class="w-full h-full object-cover rounded-2xl" alt="preview" />`;
  });

  // Publish button
  const publishBtn = document.getElementById("publishBtn");
  const btnLabel = publishBtn.querySelector("span:first-child");

  publishBtn.addEventListener("click", async () => {
    const file = fileInput?.files?.[0] || null;
    const title = document.getElementById("titleInput").value.trim();
    const overview = document.getElementById("overview").value.trim();
    const description = document.getElementById("descriptionInput").value.trim();
    const category = categorySelect.value;

    if (!title) { showToast("Please enter a title.", "error"); return; }
    if (!category) { showToast("Please select a category.", "error"); return; }

    // Collect artists
    const artists = {};
    const fieldMap = [
      ["graphicArtist", "Graphic Artist"],
      ["writer", "Writer"],
      ["Videographer", "Videographer"],
      ["Photographer", "Photographer"],
    ];
    fieldMap.forEach(([id, label]) => {
      const val = document.getElementById(id)?.value.trim();
      if (val) artists[label] = val;
    });

    const collabName =
      category === "team_collaboration"
        ? document.getElementById("collabName")?.value.trim() || null
        : null;

    publishBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = "Uploading…";

    let imageUrl = null;
    let videoUrl = null;

    try {
      if (file) {
        showToast("Uploading media to Cloudinary…", "info");
        const result = await uploadToCloudinary(file, (pct) => {
          if (btnLabel) btnLabel.textContent = `Uploading… ${pct}%`;
        });
        if (file.type.startsWith("video/")) {
          videoUrl = result.secure_url;
        } else {
          imageUrl = result.secure_url;
        }
      }

      if (btnLabel) btnLabel.textContent = "Saving…";

      await dbInsert({
        title,
        overview: overview || null,
        description: description || null,
        category,
        collab_name: collabName,
        artists,
        image_url: imageUrl,
        video_url: videoUrl,
      });

      showToast("Artwork published! 🎉", "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 1400);

    } catch (err) {
      console.error(err);
      showToast("Something went wrong. Please try again.", "error");
      publishBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = "Publish Artwork";
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────

if (document.getElementById("artworkGrid")) {

  const grid = document.getElementById("artworkGrid");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");

  const CATEGORY_LABELS = {
    graphic_design: "Graphic Design",
    written_works: "Written Works",
    photo_creation: "Photo Creation",
    video_production: "Video Production",
    team_collaboration: "Team Collaboration",
  };

  const CATEGORY_COLORS = {
    graphic_design: "bg-violet-100 text-violet-700",
    written_works: "bg-sky-100 text-sky-700",
    photo_creation: "bg-emerald-100 text-emerald-700",
    video_production: "bg-rose-100 text-rose-700",
    team_collaboration: "bg-orange-100 text-orange-700",
  };

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function artistLine(artists) {
    if (!artists || !Object.keys(artists).length) return "";
    return Object.entries(artists)
      .map(([role, name]) =>
        `<span class="text-stone-500">${role}:</span> <span class="font-medium text-stone-800">${name}</span>`
      )
      .join(`<span class="text-stone-300 mx-1">·</span>`);
  }

  function renderCard(a) {
    const catLabel = CATEGORY_LABELS[a.category] || a.category;
    const catColor = CATEGORY_COLORS[a.category] || "bg-stone-100 text-stone-600";
    const hasArtists = a.artists && Object.keys(a.artists).length > 0;

    const badge = `<span class="absolute top-3 left-3 text-[0.6rem] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${catColor} font-syne shadow-sm">${catLabel}</span>`;

    const mediaBlock = a.video_url
      ? `<div class="relative overflow-hidden bg-stone-900 aspect-[4/3]">
           <video src="${a.video_url}"
             class="w-full h-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
             muted loop playsinline
             onmouseenter="this.play()" onmouseleave="this.pause()"></video>
           <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div class="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
               <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M8 5v14l11-7z"/>
               </svg>
             </div>
           </div>
           ${badge}
         </div>`
      : a.image_url
        ? `<div class="relative overflow-hidden bg-stone-100 aspect-[4/3]">
           <img src="${a.image_url}" alt="${a.title}"
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             loading="lazy" />
           ${badge}
         </div>`
        : `<div class="relative flex items-center justify-center aspect-[4/3] bg-gradient-to-br from-orange-50 to-stone-100">
           <span class="text-5xl">🖼️</span>
           ${badge}
         </div>`;

    return `
      <article data-id="${a.id}"
        class="artwork-card group flex flex-col bg-white border border-stone-100 rounded-3xl shadow-sm overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100">
        ${mediaBlock}
        <div class="flex flex-col flex-1 p-5 gap-3">
          <div class="flex items-start justify-between gap-2">
            <h2 class="text-lg leading-snug font-instrument text-stone-900 flex-1">${a.title}</h2>
            <span class="text-xs text-stone-400 font-outfit shrink-0 pt-0.5">${timeAgo(a.published_at)}</span>
          </div>
          ${a.overview ? `<p class="text-sm leading-relaxed text-stone-500 line-clamp-2">${a.overview}</p>` : ""}
          ${hasArtists ? `<p class="text-xs font-outfit leading-relaxed mt-auto pt-3 border-t border-stone-100">${artistLine(a.artists)}</p>` : ""}
        </div>
      </article>`;
  }

  function showSkeletons(n = 6) {
    grid.innerHTML = Array(n).fill(
      `<div class="bg-white border border-stone-100 rounded-3xl shadow-sm overflow-hidden animate-pulse">
         <div class="bg-stone-200 aspect-[4/3]"></div>
         <div class="p-5 flex flex-col gap-3">
           <div class="h-4 bg-stone-200 rounded-full w-3/4"></div>
           <div class="h-3 bg-stone-100 rounded-full w-full"></div>
           <div class="h-3 bg-stone-100 rounded-full w-2/3"></div>
         </div>
       </div>`
    ).join("");
  }

  async function renderFeed(query = "") {
    showSkeletons();
    try {
      const artworks = await dbFetch(query);
      if (artworks.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove("hidden");
      } else {
        emptyState.classList.add("hidden");
        grid.innerHTML = artworks.map(renderCard).join("");
      }
    } catch (err) {
      console.error(err);
      grid.innerHTML = `
        <div class="col-span-3 text-center py-20 text-stone-400">
          <p class="text-lg font-instrument">Could not load artworks.</p>
          <p class="text-sm mt-1">Check your internet connection and try again.</p>
        </div>`;
    }
  }

  renderFeed();

  let searchTimer;
  searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderFeed(e.target.value), 400);
  });

  grid.addEventListener("click", async (e) => {
    const card = e.target.closest(".artwork-card");
    if (!card) return;
    const id = card.dataset.id;
    const all = await dbFetch();
    const art = all.find((a) => String(a.id) === String(id));
    if (art) showDetail(art);
  });

  function showDetail(a) {
    const hasArtists = a.artists && Object.keys(a.artists).length > 0;
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4";

    const mediaBlock = a.video_url
      ? `<div class="rounded-t-3xl overflow-hidden bg-stone-900 aspect-video">
           <video src="${a.video_url}" class="w-full h-full object-cover" controls autoplay muted loop playsinline></video>
         </div>`
      : a.image_url
        ? `<div class="rounded-t-3xl overflow-hidden bg-stone-100 aspect-video">
           <img src="${a.image_url}" alt="${a.title}" class="w-full h-full object-cover" />
         </div>`
        : "";

    overlay.innerHTML = `
      <div class="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        ${mediaBlock}
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-2xl font-instrument text-stone-900 leading-snug">${a.title}</h2>
            <button class="close-overlay shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors">✕</button>
          </div>
          ${a.overview ? `<p class="text-sm text-stone-500 leading-relaxed">${a.overview}</p>` : ""}
          ${a.description
        ? `<div class="border-t border-stone-100 pt-4">
                 <p class="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">${a.description}</p>
               </div>`
        : ""}
          ${hasArtists
        ? `<div class="border-t border-stone-100 pt-4 flex flex-col gap-2">
                 <p class="font-syne text-[0.6rem] font-bold tracking-widest uppercase text-orange-800 mb-1">Artists</p>
                 ${Object.entries(a.artists).map(([role, name]) =>
          `<div class="flex justify-between text-sm">
                      <span class="text-stone-500">${role}</span>
                      <span class="font-medium text-stone-800">${name}</span>
                    </div>`
        ).join("")}
               </div>`
        : ""}
          <p class="text-xs text-stone-400 text-right">
            ${new Date(a.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>`;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest(".close-overlay")) overlay.remove();
    });

    document.body.appendChild(overlay);
  }
}

// ─────────────────────────────────────────────────────────────
//  SHARED UTILITIES
// ─────────────────────────────────────────────────────────────

function showToast(message, type = "info") {
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-orange-500" };
  const toast = document.createElement("div");
  toast.className = `fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-white text-sm font-outfit font-medium shadow-xl transition-all duration-300 whitespace-nowrap ${colors[type] || colors.info}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}