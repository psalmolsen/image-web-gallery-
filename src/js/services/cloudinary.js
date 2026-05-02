const cloudinaryConfig = {
  cloudName: "drfzsz1t6",
  uploadPreset: "image-gallery",
};

// TODO: Switch Cloudinary upload preset from unsigned to signed — unsigned preset is visible in source and can be abused
export async function uploadFile(file, title) {
  const payload = new FormData();
  const safeTitle = title ? title.replace(/[^a-zA-Z0-9-_]/g, "-") : "artwork";
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  payload.append("file", file);
  payload.append("upload_preset", cloudinaryConfig.uploadPreset);
  payload.append("public_id", `artworks/${safeTitle}-${uniqueSuffix}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
    {
      method: "POST",
      body: payload,
    },
  );

  const result = await response.json();
  return result.secure_url;
}

export async function uploadFiles(files, title) {
  const uploadTasks = files.map((file) => uploadFile(file, title));
  return Promise.all(uploadTasks);
}
