import {
  createCategory,
  fetchArtworkById,
  fetchCategories,
  saveArtwork,
} from "../services/artworks.js";
import { uploadFiles } from "../services/cloudinary.js";
import { requirePublisherAuth } from "../utils/auth.js";
import { buildPageUrl } from "../utils/url.js";

const artistAddButtonClass =
  "artist-btn shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#e8874a]/35 bg-[#e8874a]/10 text-xs font-bold text-[#e8874a] transition-all duration-200 hover:bg-[#e8874a] hover:text-[#1a0903]";
const artistRemoveButtonClass =
  "artist-btn shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#2a2a2a] bg-transparent text-[#9a8f8a] transition-all duration-200 hover:border-[#e8874a] hover:text-[#e8874a]";
const artistRowClass =
  "artist-row flex items-center gap-2 border-b-2 border-[#2a2a2a] focus-within:border-[#e8874a] transition-colors duration-200";
const artistInputClass =
  "flex-1 bg-transparent outline-none py-2.5 text-sm text-[#e2d9cf] placeholder-[#6b6460] font-outfit";
const filePreviewClass =
  "relative flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#171717] px-4 py-3 text-sm font-outfit text-[#c4b4a5]";

const fileInput = document.getElementById("FileInput");
const dropzoneDefault = document.getElementById("dropzoneDefault");
const filePreviewContainer = document.getElementById("filePreviewContainer");
const categorySelect = document.getElementById("category");
const collabField = document.getElementById("collabField");
const collabNameInput = document.getElementById("collabName");
const addCategoryButton = document.getElementById("add_collab_button");
const publishButton = document.getElementById("publishBtn");

const urlParams = new URLSearchParams(window.location.search);
const editingArtworkId = urlParams.get("id");

// TODO: sessionStorage auth has been replaced with Firebase Email Link Auth
// TODO: Consider adding onAuthStateChanged listener to show a loading state
// while Firebase checks auth — prevents flash of wrong UI on page load
let selectedFiles = [];

function appendFilePreview(name, index) {
  const preview = document.createElement("div");
  preview.className = filePreviewClass;
  preview.dataset.index = index;

  const label = document.createElement("span");
  label.textContent = name;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "×";
  removeBtn.className = "ml-1 text-[#9a8f8a] hover:text-[#e8874a] font-bold text-base leading-none transition-colors duration-200";
  removeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectedFiles.splice(index, 1);
    renderFilePreviews();
  });

  preview.append(label, removeBtn);
  filePreviewContainer.appendChild(preview);
}

function renderFilePreviews() {
  filePreviewContainer.innerHTML = "";
  if (selectedFiles.length === 0) {
    dropzoneDefault.classList.remove("hidden");
    return;
  }
  dropzoneDefault.classList.add("hidden");
  selectedFiles.forEach((file, i) => appendFilePreview(file.name, i));
}

function resetFilePreview() {
  selectedFiles = [];
  filePreviewContainer.innerHTML = "";
  dropzoneDefault.classList.remove("hidden");
}

function addArtistInput(roleWrapper, presetValue = "") {
  const container = roleWrapper.querySelector(".artist-inputs");
  const placeholder = roleWrapper.querySelector("input").placeholder;
  const lastInput = container.querySelector(".artist-row:last-child input");

  if (!presetValue && lastInput && lastInput.value.trim() === "") {
    lastInput.focus();
    return lastInput;
  }

  const lastRow = container.querySelector(".artist-row:last-child");
  if (lastRow) {
    const lastButton = lastRow.querySelector(".artist-btn");
    const removableRow = lastRow;
    lastButton.textContent = "×";
    lastButton.className = artistRemoveButtonClass;
    lastButton.onclick = () => removableRow.remove();
  }

  const row = document.createElement("div");
  row.className = artistRowClass;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.className = artistInputClass;
  input.value = presetValue;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "+";
  button.className = artistAddButtonClass;
  button.addEventListener("click", () => addArtistInput(roleWrapper));

  row.append(input, button);
  container.appendChild(row);
  return input;
}

function getArtistValues(role) {
  const wrapper = document.querySelector(`[data-role="${role}"]`);
  if (!wrapper) return [];

  return Array.from(wrapper.querySelectorAll("input"))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function collectFormValues() {
  return {
    file: selectedFiles,
    title: document.getElementById("titleInput").value.trim(),
    overview: document.getElementById("overview").value.trim(),
    fullcontext: document.getElementById("descriptionInput").value.trim(),
    date: document.getElementById("Date").value,
    artists: {
      graphicartist: getArtistValues("graphicartist"),
      writer: getArtistValues("writer"),
      videographer: getArtistValues("videographer"),
      photographer: getArtistValues("photographer"),
    },
    category: categorySelect.value,
  };
}

function validateForm(data) {
  if (!data.title) {
    alert("Please enter a title for the artwork.");
    return false;
  }

  if (!data.overview) {
    alert("Please enter an overview for the artwork.");
    return false;
  }

  if (!data.fullcontext) {
    alert("Please enter a full context for the artwork.");
    return false;
  }

  if (!data.category) {
    alert("Please enter a category for the artwork.");
    return false;
  }

  if (!data.date) {
    alert("Please enter a date for the artwork.");
    return false;
  }

  const hasArtists = Object.values(data.artists).some((names) => names.length > 0);
  if (!hasArtists) {
    alert("Please enter at least one artist.");
    return false;
  }

  return true;
}

function clearForm() {
  fileInput.value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("descriptionInput").value = "";
  document.getElementById("overview").value = "";
  document.getElementById("Date").value = "";
  categorySelect.value = "";
  collabNameInput.value = "";
  collabField.classList.add("hidden");
  resetFilePreview();

  document.querySelectorAll("[data-role]").forEach((wrapper) => {
    const container = wrapper.querySelector(".artist-inputs");
    const rows = Array.from(container.querySelectorAll(".artist-row"));

    rows.forEach((row, index) => {
      if (index > 0) row.remove();
    });

    const firstInput = container.querySelector("input");
    const firstButton = container.querySelector(".artist-btn");
    if (firstInput) firstInput.value = "";
    if (firstButton) {
      firstButton.textContent = "+";
      firstButton.className = artistAddButtonClass;
      firstButton.onclick = null;
      firstButton.addEventListener("click", () => addArtistInput(wrapper), { once: true });
    }
  });

  bindInitialArtistButtons();
}

function showExistingFiles(urls) {
  if (!urls?.length) return;

  dropzoneDefault.classList.add("hidden");
  urls.forEach((url) => {
    const fileName = url.split("/").pop().split("?")[0];
    appendFilePreview(fileName);
  });
}

function bindInitialArtistButtons() {
  document.querySelectorAll("[data-role]").forEach((wrapper) => {
    const button = wrapper.querySelector(".artist-row:first-child .artist-btn");
    button.onclick = null;
    button.addEventListener("click", () => addArtistInput(wrapper));
  });
}

async function loadCategories() {
  const categories = await fetchCategories();
  categories.forEach((categoryName) => {
    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    categorySelect.insertBefore(option, categorySelect.querySelector("option[value='newCategory']"));
  });
}

function bindCategoryActions() {
  categorySelect.addEventListener("change", () => {
    collabField.classList.toggle("hidden", categorySelect.value !== "newCategory");
  });

  addCategoryButton.addEventListener("click", async () => {
    const categoryName = collabNameInput.value;

    if (!categoryName) {
      alert("Please enter a new collaboration category.");
      return;
    }

    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    categorySelect.insertBefore(option, categorySelect.querySelector("option[value='newCategory']"));
    categorySelect.value = categoryName;
    collabField.classList.add("hidden");
    collabNameInput.value = "";

    await createCategory(categoryName);
  });
}

function bindFilePreview() {
  fileInput.addEventListener("change", () => {
    selectedFiles = [...selectedFiles, ...Array.from(fileInput.files)];
    fileInput.value = "";
    renderFilePreviews();
  });
}

async function prefillEditForm() {
  if (!editingArtworkId) return;

  const artwork = await fetchArtworkById(editingArtworkId);
  if (!artwork) return;

  document.getElementById("titleInput").value = artwork.title || "";
  document.getElementById("overview").value = artwork.overview || "";
  document.getElementById("descriptionInput").value = artwork.fullcontext || "";
  document.getElementById("Date").value = artwork.date || "";
  categorySelect.value = artwork.category || "";

  Object.entries(artwork.artists || {}).forEach(([role, names]) => {
    const wrapper = document.querySelector(`[data-role="${role}"]`);
    if (!wrapper || !Array.isArray(names) || names.length === 0) return;

    const firstInput = wrapper.querySelector(".artist-row:first-child input");
    firstInput.value = names[0] || "";

    names.slice(1).forEach((name) => {
      addArtistInput(wrapper, name);
    });
  });

  showExistingFiles(artwork.image_urls);
}

publishButton.addEventListener("click", async () => {
  const formData = collectFormValues();
  if (!validateForm(formData)) return;

  const originalText = publishButton.textContent;
  publishButton.disabled = true;
  publishButton.textContent = "Publishing...";

  try {
    let uploadedUrls = [];
    if (selectedFiles.length) {
      uploadedUrls = await uploadFiles(selectedFiles, formData.title);
    }

    await saveArtwork(formData, uploadedUrls, editingArtworkId);
    clearForm();
    alert("Artwork published successfully!");
    window.location.href = buildPageUrl(window.location.href, "dashboard.html");
  } catch (error) {
    console.error("[posting] Publish failed:", error);
    // TODO: Add error boundaries â€” if Firebase fails silently right now the whole page breaks with no user feedback
    alert("An error occurred while publishing the artwork. Please try again.");
    publishButton.disabled = false;
    publishButton.textContent = originalText;
  }
});

bindInitialArtistButtons();
bindFilePreview();
bindCategoryActions();
await loadCategories();
await prefillEditForm();
requirePublisherAuth(window.location.href);
