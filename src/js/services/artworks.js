import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { db } from "./firebase.js";

const artworksCollection = collection(db, "artworks");
const categoriesCollection = collection(db, "categories");
const publishersCollection = collection(db, "publishers");

function mapArtworkSnapshot(snapshot) {
  return snapshot.docs.map((entry) => ({
    ...entry.data(),
    id: entry.id,
  }));
}

export async function isAuthorizedPublisher(email) {
  const snapshot = await getDocs(publishersCollection);
  const authorizedEmails = snapshot.docs.map((entry) =>
    entry.data().email?.toLowerCase().trim(),
  );
  return authorizedEmails.includes(email);
}

export async function fetchArtworkPage(lastVisibleDoc = null, pageSize = 6) {
  const artworkQuery = lastVisibleDoc
    ? query(
        artworksCollection,
        orderBy("date", "desc"),
        startAfter(lastVisibleDoc),
        limit(pageSize),
      )
    : query(artworksCollection, orderBy("date", "desc"), limit(pageSize));

  const snapshot = await getDocs(artworkQuery);
  const artworks = mapArtworkSnapshot(snapshot);

  return {
    artworks,
    lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function fetchAllArtworks() {
  const snapshot = await getDocs(query(artworksCollection, orderBy("date", "desc")));
  return mapArtworkSnapshot(snapshot);
}

export async function fetchArtworkById(artworkId) {
  if (!artworkId) return null;

  const snapshot = await getDoc(doc(db, "artworks", artworkId));
  if (!snapshot.exists()) return null;

  return {
    ...snapshot.data(),
    id: snapshot.id,
  };
}

export async function fetchCategories() {
  const snapshot = await getDocs(categoriesCollection);
  return snapshot.docs.map((entry) => entry.data().name).filter(Boolean);
}

export async function createCategory(name) {
  await addDoc(categoriesCollection, { name });
}

export async function createArtwork(data) {
  await addDoc(artworksCollection, data);
}

export async function updateArtwork(artworkId, data) {
  await updateDoc(doc(db, "artworks", artworkId), data);
}

export async function saveArtwork(data, uploadedUrls, editingArtworkId = null) {
  const cleanUrls = Array.isArray(uploadedUrls) ? uploadedUrls.filter(Boolean) : [];
  const basePayload = {
    title: data.title,
    overview: data.overview,
    fullcontext: data.fullcontext,
    category: data.category,
    artists: data.artists,
    date: data.date,
  };

  if (!editingArtworkId) {
    await createArtwork({
      ...basePayload,
      image_url: cleanUrls[0] || null,
      image_urls: cleanUrls,
    });
    return;
  }

  let imageUrls = cleanUrls;
  let imageUrl = cleanUrls[0] || null;

  if (cleanUrls.length === 0) {
    const existingArtwork = await fetchArtworkById(editingArtworkId);
    imageUrls = existingArtwork?.image_urls || [];
    imageUrl = existingArtwork?.image_url || null;
  }

  await updateArtwork(editingArtworkId, {
    ...basePayload,
    image_url: imageUrl,
    image_urls: imageUrls,
  });
}

export async function deleteArtwork(artworkId) {
  await deleteDoc(doc(db, "artworks", artworkId));
}
