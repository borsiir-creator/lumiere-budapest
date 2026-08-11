/* ==========================================
   LUMIÈRE BUDAPEST — gallery.js
   Ügyfél-galéria oldal
========================================== */

// Éles backend URL — ugyanaz, mint a kontakt űrlapnál
const API_BASE = "https://lumiere-budapest-backend.onrender.com/api/gallery";

const loginView = document.getElementById("loginView");
const galleryView = document.getElementById("galleryView");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const galleryTokenInput = document.getElementById("galleryToken");
const galleryPasswordInput = document.getElementById("galleryPassword");

const galleryNameEl = document.getElementById("galleryName");
const galleryExpiryEl = document.getElementById("galleryExpiry");
const galleryGrid = document.getElementById("galleryGrid");
const selectionCountEl = document.getElementById("selectionCount");
const finalizeBtn = document.getElementById("finalizeBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxFavorite = document.getElementById("lightboxFavorite");
const lightboxFavoriteLabel = document.getElementById("lightboxFavoriteLabel");
const lightboxDownload = document.getElementById("lightboxDownload");

let currentAccessToken = null;
let currentClientToken = null;
let currentGalleryType = null;
let currentGalleryStatus = null;
let photos = [];
let currentLightboxIndex = 0;

// ------------------------------------------
// Segéd: az URL-ből kiolvassuk, van-e előre megadott galéria-azonosító
// pl. gallery.html?token=389ac4922850
// ------------------------------------------
(function prefillTokenFromUrl() {

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
        galleryTokenInput.value = tokenFromUrl;
        galleryPasswordInput.focus();
    }

})();

// ------------------------------------------
// BEJELENTKEZÉS
// ------------------------------------------

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const accessToken = galleryTokenInput.value.trim();
    const password = galleryPasswordInput.value;

    const submitBtn = loginForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Entering...";
    loginStatus.textContent = "";
    loginStatus.classList.remove("success");

    try {

        const response = await fetch(`${API_BASE}/${accessToken}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Bejelentkezés sikertelen.");
        }

        currentAccessToken = accessToken;
        currentClientToken = data.token;
        currentGalleryType = data.gallery.type;
        currentGalleryStatus = data.gallery.status;

        // munkamenet mentése, hogy oldal-frissítés után se kelljen újra
        // bejelentkezni (amíg a token érvényes)
        sessionStorage.setItem("lumiere_gallery_token", currentAccessToken);
        sessionStorage.setItem("lumiere_client_token", currentClientToken);

        await loadGallery();

    } catch (error) {

        loginStatus.textContent = error.message;

    } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = "Enter Gallery";

    }

});

// ------------------------------------------
// GALÉRIA BETÖLTÉSE
// ------------------------------------------

async function loadGallery() {

    try {

        const response = await fetch(`${API_BASE}/${currentAccessToken}/photos`, {
            headers: { "Authorization": `Bearer ${currentClientToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Nem sikerült betölteni a galériát.");
        }

        photos = data.photos;
        currentGalleryType = data.gallery.type;
        currentGalleryStatus = data.gallery.status;

        renderGalleryHeader(data.gallery);
        renderGrid();
        updateSelectionUI(data.selectionCount);

        loginView.hidden = true;
        galleryView.hidden = false;

    } catch (error) {

        // Ha a munkamenet lejárt vagy érvénytelen, dobjuk vissza a login képernyőre
        sessionStorage.removeItem("lumiere_gallery_token");
        sessionStorage.removeItem("lumiere_client_token");
        loginStatus.textContent = error.message;
        loginView.hidden = false;
        galleryView.hidden = true;

    }

}

function renderGalleryHeader(gallery) {

    galleryNameEl.textContent = gallery.name;

    const expiryDate = new Date(gallery.expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
        galleryExpiryEl.textContent = `Gallery expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    } else {
        galleryExpiryEl.textContent = "This gallery has expired.";
    }

    const isSelectionGallery = gallery.type === "selection";

    selectionCountEl.hidden = !isSelectionGallery;
    finalizeBtn.hidden = !isSelectionGallery || gallery.status === "finalized";
    downloadAllBtn.hidden = gallery.type !== "final";

}

function renderGrid() {

    if (photos.length === 0) {
        galleryGrid.innerHTML = `<div class="gallery-empty">No photos have been uploaded to this gallery yet.</div>`;
        return;
    }

    galleryGrid.innerHTML = "";

    photos.forEach((photo, index) => {

        const thumb = document.createElement("div");
        thumb.className = "gallery-thumb" + (photo.selected ? " is-selected" : "");
        thumb.dataset.index = index;

        thumb.innerHTML = `
            <img src="${photo.thumbnailUrl}" alt="${photo.filename}" loading="lazy">
            <div class="thumb-selected-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        `;

        thumb.addEventListener("click", () => openLightbox(index));

        galleryGrid.appendChild(thumb);

    });

}

function updateSelectionUI(count) {

    selectionCountEl.textContent = `${count} selected`;

}

// ------------------------------------------
// LIGHTBOX
// ------------------------------------------

function openLightbox(index) {

    currentLightboxIndex = index;
    renderLightboxImage();
    lightbox.classList.add("open");

}

function closeLightbox() {

    lightbox.classList.remove("open");

}

function renderLightboxImage() {

    const photo = photos[currentLightboxIndex];

    lightboxImage.src = photo.previewUrl;
    lightboxImage.alt = photo.filename;
    lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${photos.length}`;

    const canSelect = currentGalleryType === "selection" && currentGalleryStatus !== "finalized";

    lightboxFavorite.hidden = !canSelect;
    lightboxFavorite.classList.toggle("is-selected", photo.selected);
    lightboxFavoriteLabel.textContent = photo.selected ? "Selected" : "Select";

    const canDownload = currentGalleryType === "final" && photo.downloadUrl;
    lightboxDownload.hidden = !canDownload;
    if (canDownload) {
        lightboxDownload.href = photo.downloadUrl;
        lightboxDownload.setAttribute("download", photo.filename);
    }

}

function showLightboxImage(index) {

    if (index < 0) index = photos.length - 1;
    if (index >= photos.length) index = 0;

    currentLightboxIndex = index;
    renderLightboxImage();

}

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => showLightboxImage(currentLightboxIndex - 1));
lightboxNext.addEventListener("click", () => showLightboxImage(currentLightboxIndex + 1));

lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {

    if (!lightbox.classList.contains("open")) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showLightboxImage(currentLightboxIndex - 1);
    if (event.key === "ArrowRight") showLightboxImage(currentLightboxIndex + 1);
    if (event.key === " ") {
        event.preventDefault();
        lightboxFavorite.click();
    }

});

// ------------------------------------------
// KIVÁLASZTÁS (lightboxból)
// ------------------------------------------

lightboxFavorite.addEventListener("click", async () => {

    const photo = photos[currentLightboxIndex];
    const wasSelected = photo.selected;

    lightboxFavorite.disabled = true;

    try {

        const method = wasSelected ? "DELETE" : "POST";

        const response = await fetch(
            `${API_BASE}/${currentAccessToken}/selections/${photo.id}`,
            {
                method,
                headers: { "Authorization": `Bearer ${currentClientToken}` }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Nem sikerült frissíteni a kiválasztást.");
        }

        photo.selected = !wasSelected;
        updateSelectionUI(data.selectionCount);
        renderLightboxImage();

        // a rács-nézetben is frissítsük a jelölést
        const thumbEl = galleryGrid.querySelector(`[data-index="${currentLightboxIndex}"]`);
        if (thumbEl) thumbEl.classList.toggle("is-selected", photo.selected);

    } catch (error) {

        alert(error.message);

    } finally {

        lightboxFavorite.disabled = false;

    }

});

// ------------------------------------------
// VÉGLEGESÍTÉS
// ------------------------------------------

finalizeBtn.addEventListener("click", async () => {

    const selectedCount = photos.filter(p => p.selected).length;

    if (selectedCount === 0) {
        alert("Please select at least one photo before finalizing.");
        return;
    }

    const confirmed = confirm(
        `You have selected ${selectedCount} photo${selectedCount === 1 ? "" : "s"}. ` +
        `Once finalized, you won't be able to change your selection. Continue?`
    );

    if (!confirmed) return;

    finalizeBtn.disabled = true;
    finalizeBtn.textContent = "Finalizing...";

    try {

        const response = await fetch(`${API_BASE}/${currentAccessToken}/finalize`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${currentClientToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Nem sikerült véglegesíteni a választást.");
        }

        currentGalleryStatus = "finalized";
        finalizeBtn.hidden = true;
        alert("Thank you! Your selection has been finalized.");

    } catch (error) {

        alert(error.message);
        finalizeBtn.disabled = false;
        finalizeBtn.textContent = "Finalize Selection";

    }

});

// ------------------------------------------
// AUTOMATIKUS BEJELENTKEZÉS, ha van érvényes mentett munkamenet
// ------------------------------------------

(async function tryAutoLogin() {

    const savedGalleryToken = sessionStorage.getItem("lumiere_gallery_token");
    const savedClientToken = sessionStorage.getItem("lumiere_client_token");

    if (savedGalleryToken && savedClientToken) {

        currentAccessToken = savedGalleryToken;
        currentClientToken = savedClientToken;

        await loadGallery();

    }

})();

// ------------------------------------------
// "Download All" — ZIP letöltés
// ------------------------------------------

downloadAllBtn.addEventListener("click", async () => {

    downloadAllBtn.disabled = true;
    const originalText = downloadAllBtn.textContent;
    downloadAllBtn.textContent = "Preparing ZIP...";

    try {

        const response = await fetch(`${API_BASE}/${currentAccessToken}/download-all`, {
            headers: { "Authorization": `Bearer ${currentClientToken}` }
        });

        if (!response.ok) {

            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Nem sikerült letölteni a ZIP fájlt.");

        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        const tempLink = document.createElement("a");
        tempLink.href = downloadUrl;
        tempLink.download = `${galleryNameEl.textContent || "gallery"}.zip`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {

        alert(error.message);

    } finally {

        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = originalText;

    }

});
