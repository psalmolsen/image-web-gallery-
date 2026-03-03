const cloudinaryConfig = {
  cloudName: "drfzsz1t6",
  uploadPreset: "image-gallery"
}


// Artwork data form (collect values)
class FormValues {
  //setters function 
  setFormValues() {
    // artwork data  
    this.file = document.getElementById("FileInput").files
    this.title = document.getElementById("titleInput").value.trim()
    this.overview = document.getElementById("overview").value.trim()
    this.fullcontext = document.getElementById("descriptionInput").value.trim()

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
    document.querySelector("#descriptionInput").value = null
    document.querySelector("#overview").value = null
    document.querySelector("#GraphicArtist").value = null
    document.querySelector("#Writer").value = null
    document.querySelector("#Videographer").value = null
    document.querySelector("#Photographer").value = null
    document.querySelector("#category").value = null
  }
}

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



function addCategory() {


  document.querySelector("#category").addEventListener("change", function () {
    if (this.value == "team_collaboration") {
      document.querySelector("#collabField").classList.remove("hidden")
    } else {
      document.querySelector("#collabField").classList.add("hidden")
    }
  })



  document.querySelector("#add_collab_button").addEventListener("click", function () {

    const collabName = document.querySelector("#collabName").value

    if (!collabName) {
      alert("Please enter a name for the collaboration category.")
      return
    }

    const newCategory = document.createElement("option")


    newCategory.value = collabName
    newCategory.textContent = collabName

    document.querySelector("#category").insertBefore(newCategory, document.querySelector("#category option[value='team_collaboration']"))


    document.querySelector("#category").value = collabName


    document.querySelector("#collabField").classList.add("hidden")

    document.querySelector("#collabName").value = ""
  })
}

addCategory()

//publish button
const publishBtn = document.querySelector("#publishBtn")
publishBtn.addEventListener("click", async function () {

  const form = new FormValues()

  if (!form.validateForm()) {
    return false
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Publishing...";

  const data = form.getFormValues()
  const url = await cloudinaryUpload(data.file[0])



  //firebase

  form.clearForm()
});



