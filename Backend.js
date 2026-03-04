import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";



//clodunary config
const cloudinaryConfig = {
  cloudName: "drfzsz1t6",
  uploadPreset: "image-gallery"
}

//firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDBbtlkqF_CkQGdcNU10senOniW3cgPmCs",
  authDomain: "image-gallery-2748a.firebaseapp.com",
  projectId: "image-gallery-2748a",
  storageBucket: "image-gallery-2748a.firebasestorage.app",
  messagingSenderId: "791757901948",
  appId: "1:791757901948:web:c37632e8577102d95039f9",
  measurementId: "G-VV38EKG4QK"
};
//initialized firebase  
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Artwork data form (collect values)
class FormValues {
  //setters function 
  setFormValues() {
    // artwork data  
    this.file = document.getElementById("FileInput").files
    this.title = document.getElementById("titleInput").value.trim()
    this.overview = document.getElementById("overview").value.trim()
    this.fullcontext = document.getElementById("descriptionInput").value.trim()
    this.date = document.getElementById("Date").value

    //artist data 
    this.graphicartist = document.getElementById("GraphicArtist").value.trim()
    this.writer = document.getElementById("Writer").value.trim()
    this.videographer = document.getElementById("Videographer").value.trim()
    this.photographer = document.getElementById("Photographer").value.trim()

    //artwork category
    this.artcategory = document.getElementById("category").value
  }
  //setters function 
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

  // validate function (check if values are empty)  
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
    return true
  }

  //clear textfield after submit
  clearForm() {
    document.querySelector("#FileInput").value = null
    document.querySelector("#titleInput").value = null
    document.querySelector("#descriptionInput").value = null
    document.querySelector("#overview").value = null
    document.querySelector("#GraphicArtist").value = null
    document.querySelector("#Writer").value = null
    document.querySelector("#Videographer").value = null
    document.querySelector("#Photographer").value = null
    document.querySelector("#category").value = null
  }
}



//add new category 
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

//cloudinary upload function
async function cloudinaryUpload(file) {
  const dataFile = new FormData()

  dataFile.append("file", file)
  dataFile.append("upload_preset", cloudinaryConfig.uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`, {
    method: "POST",
    body: dataFile
  })
  const result = await response.json()
  return result.secure_url

}

//firebase upload
async function firebaseUpload(data, url) {

  await addDoc(collection(db, "artworks"), {
    title: data.title,
    overview: data.overview,
    fullcontext: data.fullcontext,
    category: data.category,
    artists: data.artists,
    image_url: url,
    date: data.date
  })
}

//publish button
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
    // const url = await cloudinaryUpload(data.file[0])
    // await firebaseUpload(data, url)


    let url = null

    if (data.file[0]) {
      url = await cloudinaryUpload(data.file[0])
    }
    await firebaseUpload(data, url)
    form.clearForm()
    alert("Artwork published successfully!")
    window.location.href = "Dashboard.html"

  } catch (error) {
    alert("An error occurred while publishing the artwork. Please try again.")
    publishBtn.disabled = false;
    publishBtn.textContent = originalText;

  }
});



