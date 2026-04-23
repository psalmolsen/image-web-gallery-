import { db } from "./firebase.js"
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"






// Cloudinary config
const cloudinaryConfig = {
  cloudName: "drfzsz1t6",
  uploadPreset: "image-gallery"
}

// Add artist on the same team
function addArtistInput(roleWrapper) {
  const container = roleWrapper.querySelector('.artist-inputs')
  const placeholder = roleWrapper.querySelector('input').placeholder

  const lastInput = container.querySelector('.artist-row:last-child input')
  if (lastInput && lastInput.value.trim() === '') {
    lastInput.focus()
    return
  }
  // convert current last row's + to ✕
  const lastRow = container.querySelector('.artist-row:last-child')
  if (lastRow) {
    const lastBtn = lastRow.querySelector('.artist-btn')
    lastBtn.textContent = '✕'
    lastBtn.classList.remove('bg-orange-100', 'text-orange-500', 'hover:bg-orange-500', 'hover:text-white')
    lastBtn.classList.add('text-stone-300', 'hover:text-orange-500', 'bg-transparent')
    lastBtn.addEventListener('click', () => lastRow.remove())
  }

  // create new row with +
  const row = document.createElement('div')
  row.className = 'artist-row flex items-center gap-2 border-b-2 border-orange-100 focus-within:border-orange-500 transition-colors duration-200'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = placeholder
  input.className = 'flex-1 bg-transparent outline-none py-2.5 text-sm text-stone-900 placeholder-stone-400 font-outfit'

  const plusBtn = document.createElement('button')
  plusBtn.type = 'button'
  plusBtn.textContent = '+'
  plusBtn.className = 'artist-btn shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-500 text-xs font-bold hover:bg-orange-500 hover:text-white transition-all duration-200 flex items-center justify-center'
  plusBtn.addEventListener('click', () => addArtistInput(roleWrapper))

  row.appendChild(input)
  row.appendChild(plusBtn)
  container.appendChild(row)
}

function getArtistValues(role) {
  const wrapper = document.querySelector(`[data-role="${role}"]`)
  if (!wrapper) return []
  return Array.from(wrapper.querySelectorAll('input'))
    .map(i => i.value.trim())
    .filter(Boolean)
}

// wire up all initial + buttons
document.querySelectorAll('[data-role]').forEach(wrapper => {
  wrapper.querySelector('.artist-btn').addEventListener('click', () => {
    addArtistInput(wrapper)
  })
})


// Artwork data form (collect values)
class FormValues {
  // Setters function 
  setFormValues() {
    // artwork data  
    this.file = document.getElementById("FileInput").files
    this.title = document.getElementById("titleInput").value.trim()
    this.overview = document.getElementById("overview").value.trim()
    this.fullcontext = document.getElementById("descriptionInput").value.trim()
    this.date = document.getElementById("Date").value

    //artist data 
    this.graphicartist = getArtistValues("graphicartist")
    this.writer = getArtistValues("writer")
    this.videographer = getArtistValues("videographer")
    this.photographer = getArtistValues("photographer")

    //artwork category
    this.artcategory = document.getElementById("category").value
  }
  // Getters function 
  getFormValues() {
    this.setFormValues()
    return {
      file: this.file,
      title: this.title,
      overview: this.overview,
      fullcontext: this.fullcontext,
      date: this.date,

      artists: {
        graphicartist: this.graphicartist,
        writer: this.writer,
        videographer: this.videographer,
        photographer: this.photographer
      },
      category: this.artcategory

    }
  }

  // Validate function (check if values are empty)  
  validateForm() {
    let data = this.getFormValues()

    if (!data.title) {
      alert("Please enter a title for the artwork.")
      return false
    }

    if (!data.overview) {
      alert("Please enter an overview for the artwork.")
      return false
    }

    if (!data.fullcontext) {
      alert("Please enter a full context for the artwork.")
      return false
    }
    if (!data.category) {
      alert("Please enter a category for the artwork.")
      return false
    }
    if (!data.date) {
      alert("Please enter a date for the artwork.")
      return false
    }
    if ((!data.artists.graphicartist.length && !data.artists.writer.length && !data.artists.videographer.length && !data.artists.photographer.length)) {
      alert("Please enter at least one artist.")
      return false
    }
    return true
  }

  // Clear textfield after submit
  clearForm() {
    document.querySelector("#FileInput").value = null
    document.querySelector("#titleInput").value = null
    document.querySelector("#descriptionInput").value = null
    document.querySelector("#overview").value = null
    document.querySelector("#category").value = null

    document.querySelectorAll('[data-role]').forEach(wrapper => {
      const container = wrapper.querySelector('.artist-inputs')
      // remove all rows except first
      const rows = container.querySelectorAll('.artist-row')
      rows.forEach((row, i) => { if (i > 0) row.remove() })
      // clear first row input and reset its button back to +
      const firstInput = container.querySelector('input')
      const firstBtn = container.querySelector('.artist-btn')
      if (firstInput) firstInput.value = ''
      if (firstBtn) {
        firstBtn.textContent = '+'
        firstBtn.className = 'artist-btn shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-500 text-xs font-bold hover:bg-orange-500 hover:text-white transition-all duration-200 flex items-center justify-center'
      }
    })
  }
}

function fileoverview() {
  const fileinput = document.querySelector("#FileInput")
  const dropzonedefault = document.querySelector("#dropzoneDefault")
  const filepreviewcontainer = document.querySelector("#filePreviewContainer")



  fileinput.addEventListener("change", function () {
    Array.from(this.files).forEach(file => {
      dropzonedefault.classList.add("hidden")
      filepreviewcontainer.classList.remove("hidden")
      const card = document.createElement("div")
      card.className = "flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-outfit text-stone-700 shadow-sm"
      card.textContent = file.name
      filepreviewcontainer.appendChild(card)

    });

  })






}
fileoverview()




// Add new category 
async function saveCategory(newCategrory) {
  await addDoc(collection(db, "categories"), {
    name: newCategrory

  })

}

function addCategory() {
  document.querySelector("#category").addEventListener("change", function () {
    if (this.value == "newCategory") {
      document.querySelector("#collabField").classList.remove("hidden")
    } else {
      document.querySelector("#collabField").classList.add("hidden")
    }
  })

  document.querySelector("#add_collab_button").addEventListener("click", async function () {
    const categoryName = document.querySelector("#collabName").value

    if (!categoryName) {
      alert("Please enter a new collaboration category.")
      return
    }

    const newCategory = document.createElement("option")
    newCategory.value = categoryName
    newCategory.textContent = categoryName
    document.querySelector("#category").insertBefore(newCategory, document.querySelector("#category option[value='newCategory']"))
    document.querySelector("#category").value = categoryName
    document.querySelector("#collabField").classList.add("hidden")
    document.querySelector("#collabName").value = ""
    await saveCategory(categoryName)
  })
}

async function loadCategory() {
  const result = await getDocs(collection(db, "categories"))
  result.forEach(doc => {
    const categoryData = doc.data()
    const categoryOption = document.createElement("option")
    categoryOption.value = categoryData.name
    categoryOption.textContent = categoryData.name
    document.querySelector("#category").insertBefore(categoryOption, document.querySelector("#category option[value='newCategory']"))
  })
}

addCategory()
loadCategory()

// Cloudinary upload function
async function cloudinaryUpload(file, title) {
  const dataFile = new FormData()
  const safeTitle = title ? title.replace(/[^a-zA-Z0-9-_]/g, "-") : "artwork"
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  dataFile.append("file", file)
  dataFile.append("upload_preset", cloudinaryConfig.uploadPreset)
  dataFile.append("public_id", `artworks/${safeTitle}-${uniqueSuffix}`)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`, {
    method: "POST",
    body: dataFile
  })
  const result = await response.json()
  return result.secure_url

}

async function cloudinaryUploadMultiple(files, title) {
  const uploadTasks = files.map((file) => cloudinaryUpload(file, title))
  return Promise.all(uploadTasks)
}

// Firebase upload
async function firebaseUpload(data, urls, editingArtworkId) {
  const cleanUrls = Array.isArray(urls) ? urls.filter(Boolean) : []
  const primaryUrl = cleanUrls[0] || null

  if (editingArtworkId) {
    const docRef = doc(db, "artworks", editingArtworkId)

    let finalImageUrl = primaryUrl
    let finalImageUrls = cleanUrls

    if (cleanUrls.length === 0) {
      // No new files uploaded, get old URLs
      const existingDoc = await getDoc(docRef)
      const existingData = existingDoc.data()
      finalImageUrl = existingData.image_url
      finalImageUrls = existingData.image_urls
    }

    await updateDoc(docRef, {
      title: data.title,
      overview: data.overview,
      fullcontext: data.fullcontext,
      category: data.category,
      artists: data.artists,
      image_url: finalImageUrl,
      image_urls: finalImageUrls,
      date: data.date
    })
  }
  else {
    await addDoc(collection(db, "artworks"), {
      title: data.title,
      overview: data.overview,
      fullcontext: data.fullcontext,
      category: data.category,
      artists: data.artists,
      image_url: primaryUrl,
      image_urls: cleanUrls,
      date: data.date
    })
  }
}


// Publish button
const publishBtn = document.querySelector("#publishBtn")
publishBtn.addEventListener("click", async function () {

  const form = new FormValues()

  if (!form.validateForm()) {
    return false
  }

  const originalText = publishBtn.textContent;
  publishBtn.disabled = true;
  publishBtn.textContent = "Publishing...";

  const data = form.getFormValues()

  try {
    let urls = []

    if (data.file && data.file.length) {
      urls = await cloudinaryUploadMultiple(Array.from(data.file), data.title)
    }
    await firebaseUpload(data, urls, editingArtworkId)
    form.clearForm()
    alert("Artwork published successfully!")
    window.location.href = "Dashboard.html"

  } catch (error) {
    alert("An error occurred while publishing the artwork. Please try again.")
    publishBtn.disabled = false;
    publishBtn.textContent = originalText;

  }
});



// Edit 
const urlParams = new URLSearchParams(window.location.search)
const editingArtworkId = urlParams.get('id')
const docRef = doc(db, "artworks", editingArtworkId)
const docSnap = await getDoc(docRef)

// Show existing file in pills
function showExistingFiles(urls) {
  if (!urls || urls.length === 0) return

  const dropzonedefault = document.querySelector("#dropzoneDefault")
  const filepreviewcontainer = document.querySelector("#filePreviewContainer")

  dropzonedefault.classList.add("hidden")
  filepreviewcontainer.classList.remove("hidden")

  urls.forEach((url, index) => {
    const fileName = url.split('/').pop().split('?')[0]
    const card = document.createElement("div")
    card.className = "flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-outfit text-stone-700 shadow-sm"
    card.textContent = fileName
    filepreviewcontainer.appendChild(card)
  })
}

if (docSnap.exists()) {
  const data = docSnap.data()

  //pre-fill value 
  document.getElementById('titleInput').value = data.title;
  document.getElementById('overview').value = data.overview;
  document.getElementById('descriptionInput').value = data.fullcontext;
  document.getElementById('Date').value = data.date;
  document.getElementById('category').value = data.category;

  Object.entries(data.artists).forEach(([role, names]) => {
    const wrapper = document.querySelector(`[data-role="${role}"]`)

    if (names.length > 0) {
      names.forEach((name) => {
        addArtistInput(wrapper)
        wrapper.lastElementChild.querySelector('input').value = name
      }
      )
    }
  })
  showExistingFiles(data.image_urls)
}









//todo:make sure that it is adaptive to all devices (mobile, desktop, tablet, etc.)
//todo: off browser suggestion on the form
//todo: docker
//todo: refactor