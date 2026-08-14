/* ==========================================
   LUMIÈRE BUDAPEST — admin.js
========================================== */

const API_BASE = "https://lumiere-budapest-backend.onrender.com/api/admin";
const PORTFOLIO_API_BASE = "https://lumiere-budapest-backend.onrender.com/api/portfolio";
const GALLERY_PAGE_URL = "https://lumiere-budapest.com/gallery.html";

let adminToken = null;
let galleries = [];
let currentDetailToken = null;
let currentDetailGalleryType = null;
let selectedFiles = [];

// --- DOM elemek ---
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const logoutBtn = document.getElementById("logoutBtn");

const galleriesTableBody = document.getElementById("galleriesTableBody");
const galleriesEmpty = document.getElementById("galleriesEmpty");

const newGalleryBtn = document.getElementById("newGalleryBtn");
const newGalleryModal = document.getElementById("newGalleryModal");
const newGalleryForm = document.getElementById("newGalleryForm");
const cancelNewGalleryBtn = document.getElementById("cancelNewGalleryBtn");
const newGalleryStatus = document.getElementById("newGalleryStatus");

const accessInfoModal = document.getElementById("accessInfoModal");
const accessInfoUrl = document.getElementById("accessInfoUrl");
const accessInfoPassword = document.getElementById("accessInfoPassword");
const closeAccessInfoBtn = document.getElementById("closeAccessInfoBtn");

const galleryDetail = document.getElementById("galleryDetail");
const detailGalleryName = document.getElementById("detailGalleryName");
const detailGalleryMeta = document.getElementById("detailGalleryMeta");
const closeDetailBtn = document.getElementById("closeDetailBtn");
const detailPhotosGrid = document.getElementById("detailPhotosGrid");

const photoUploadInput = document.getElementById("photoUploadInput");
const uploadLabelText = document.getElementById("uploadLabelText");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");

// ------------------------------------------
// BEJELENTKEZÉS
// ------------------------------------------

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const password = document.getElementById("adminPassword").value;
    const submitBtn = loginForm.querySelector("button[type='submit']");

    submitBtn.disabled = true;
    loginStatus.textContent = "";

    try {

        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Bejelentkezés sikertelen.");
        }

        adminToken = data.token;
        sessionStorage.setItem("lumiere_admin_token", adminToken);

        showDashboard();

    } catch (error) {

        loginStatus.textContent = error.message;

    } finally {

        submitBtn.disabled = false;

    }

});

logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("lumiere_admin_token");
    adminToken = null;
    location.reload();
});

(function tryAutoLogin() {

    const saved = sessionStorage.getItem("lumiere_admin_token");

    if (saved) {
        adminToken = saved;
        showDashboard();
    }

})();

async function showDashboard() {

    loginView.hidden = true;
    dashboardView.hidden = false;
    logoutBtn.hidden = false;
    document.getElementById("adminTabs").hidden = false;

    await loadGalleries();

}

// ------------------------------------------
// GALÉRIA LISTA
// ------------------------------------------

async function loadGalleries() {

    try {

        const response = await fetch(`${API_BASE}/galleries`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const data = await response.json();

        if (!response.ok) {

            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem("lumiere_admin_token");
                location.reload();
                return;
            }

            throw new Error(data.error || "Nem sikerült betölteni a galériákat.");

        }

        galleries = data.galleries;
        renderGalleriesTable();

    } catch (error) {

        alert(error.message);

    }

}

function renderGalleriesTable() {

    if (galleries.length === 0) {
        galleriesTableBody.innerHTML = "";
        galleriesEmpty.hidden = false;
        return;
    }

    galleriesEmpty.hidden = true;

    galleriesTableBody.innerHTML = galleries.map(gallery => {

        const expiryDate = new Date(gallery.expires_at);
        const expiryLabel = expiryDate.toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" });

        return `
            <tr data-token="${gallery.access_token}">
                <td>${escapeHtml(gallery.customer_name)}</td>
                <td>${escapeHtml(gallery.name)}</td>
                <td>${gallery.type === "selection" ? "Selection" : "Final"}</td>
                <td><span class="status-badge status-${gallery.status}">${gallery.status}</span></td>
                <td>${gallery.photo_count}</td>
                <td>${gallery.type === "selection" ? gallery.selection_count : "—"}</td>
                <td>${expiryLabel}</td>
            </tr>
        `;

    }).join("");

    galleriesTableBody.querySelectorAll("tr").forEach(row => {
        row.addEventListener("click", () => openGalleryDetail(row.dataset.token));
    });

}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ------------------------------------------
// ÚJ GALÉRIA LÉTREHOZÁSA
// ------------------------------------------

newGalleryBtn.addEventListener("click", () => {
    newGalleryModal.hidden = false;
});

cancelNewGalleryBtn.addEventListener("click", () => {
    newGalleryModal.hidden = true;
    newGalleryForm.reset();
    newGalleryStatus.textContent = "";
});

newGalleryForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const payload = {
        customerName: document.getElementById("customerName").value.trim(),
        customerEmail: document.getElementById("customerEmail").value.trim() || undefined,
        galleryName: document.getElementById("galleryName").value.trim(),
        type: document.getElementById("galleryType").value,
        expiryDays: document.getElementById("expiryDays").value
            ? Number(document.getElementById("expiryDays").value)
            : undefined
    };

    const submitBtn = newGalleryForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    newGalleryStatus.textContent = "";

    try {

        const response = await fetch(`${API_BASE}/galleries`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Nem sikerült létrehozni a galériát.");
        }

        newGalleryModal.hidden = true;
        newGalleryForm.reset();

        // Hozzáférési adatok megjelenítése — CSAK MOST látszik a jelszó
        accessInfoUrl.textContent = `${GALLERY_PAGE_URL}?token=${data.accessInfo.accessToken}`;
        accessInfoPassword.textContent = data.accessInfo.password;
        accessInfoModal.hidden = false;

        await loadGalleries();

    } catch (error) {

        newGalleryStatus.textContent = error.message;

    } finally {

        submitBtn.disabled = false;

    }

});

closeAccessInfoBtn.addEventListener("click", () => {
    accessInfoModal.hidden = true;
});

document.querySelectorAll(".copy-btn").forEach(btn => {

    btn.addEventListener("click", () => {

        const targetId = btn.dataset.copyTarget;
        const text = document.getElementById(targetId).textContent;

        navigator.clipboard.writeText(text).then(() => {
            const original = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = original; }, 1500);
        });

    });

});

// ------------------------------------------
// GALÉRIA RÉSZLETEK + FOTÓK
// ------------------------------------------

async function openGalleryDetail(accessToken) {

    currentDetailToken = accessToken;
    const gallery = galleries.find(g => g.access_token === accessToken);
    currentDetailGalleryType = gallery.type;

    detailGalleryName.textContent = gallery.name;
    detailGalleryMeta.textContent =
        `${gallery.customer_name} · ${gallery.type === "selection" ? "Selection" : "Final"} · ${gallery.photo_count} photos`;
    galleryDetail.hidden = false;
    galleryDetail.scrollIntoView({ behavior: "smooth", block: "start" });

    resetUploadState();
    await loadDetailPhotos();

}

closeDetailBtn.addEventListener("click", () => {
    galleryDetail.hidden = true;
    currentDetailToken = null;
});

async function loadDetailPhotos() {

    detailPhotosGrid.innerHTML = "<p style='color:#888;'>Loading…</p>";

    try {

        const response = await fetch(`${API_BASE}/galleries/${currentDetailToken}/photos`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Nem sikerült betölteni a fotókat.");
        }

        if (data.photos.length === 0) {
            detailPhotosGrid.innerHTML = "<p style='color:#888;'>No photos uploaded yet.</p>";
            return;
        }

        // "Selection" típusú galériánál mutassuk, hány képet választott ki az ügyfél
        if (currentDetailGalleryType === "selection") {
            detailGalleryMeta.textContent += ` · ${data.selectionCount} selected by client`;
        }

        detailPhotosGrid.innerHTML = data.photos.map(photo => `
            <div class="detail-photo${photo.selected ? " is-selected" : ""}">
                <img src="${photo.thumbnailUrl}" alt="${escapeHtml(photo.original_filename)}" loading="lazy">
                ${photo.selected ? `
                    <div class="detail-photo-badge" title="Selected by client">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                ` : ""}
                <span class="filename">${escapeHtml(photo.original_filename)}</span>
            </div>
        `).join("");

    } catch (error) {

        detailPhotosGrid.innerHTML = `<p style="color:#e06666;">${escapeHtml(error.message)}</p>`;

    }

}

// ------------------------------------------
// FOTÓFELTÖLTÉS
// ------------------------------------------

function resetUploadState() {
    selectedFiles = [];
    photoUploadInput.value = "";
    uploadLabelText.textContent = "Click to choose photos, or drag & drop here";
    uploadBtn.disabled = true;
    uploadStatus.textContent = "";
}

photoUploadInput.addEventListener("change", () => {

    selectedFiles = Array.from(photoUploadInput.files);
    uploadLabelText.textContent = selectedFiles.length > 0
        ? `${selectedFiles.length} file(s) selected`
        : "Click to choose photos, or drag & drop here";
    uploadBtn.disabled = selectedFiles.length === 0;

});

uploadBtn.addEventListener("click", async () => {

    if (selectedFiles.length === 0 || !currentDetailToken) return;

    uploadBtn.disabled = true;
    uploadStatus.textContent = `Uploading ${selectedFiles.length} photo(s)... this can take a while for large files.`;

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append("photos", file));

    try {

        const response = await fetch(`${API_BASE}/galleries/${currentDetailToken}/photos`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${adminToken}` },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Feltöltés sikertelen.");
        }

        uploadStatus.textContent = `✅ ${data.uploaded} uploaded, ${data.failed} failed.`;

        resetUploadState();
        await loadDetailPhotos();
        await loadGalleries();

    } catch (error) {

        uploadStatus.textContent = `❌ ${error.message}`;
        uploadBtn.disabled = false;

    }

});

/* ==========================================
   PORTFOLIO — Tab-váltás
   ========================================== */

const portfolioView = document.getElementById("portfolioView");
let portfolioLoadedOnce = false;

document.querySelectorAll(".admin-tab").forEach(tab => {

    tab.addEventListener("click", async () => {

        document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const target = tab.dataset.tab;

        if (target === "galleries") {
            dashboardView.hidden = false;
            portfolioView.hidden = true;
        } else {
            dashboardView.hidden = true;
            portfolioView.hidden = false;

            if (!portfolioLoadedOnce) {
                portfolioLoadedOnce = true;
                await loadStandalonePhotos();
                await loadAlbums();
            }
        }

    });

});

/* ==========================================
   PORTFOLIO — Önálló képek
   ========================================== */

const standaloneUploadInput = document.getElementById("standaloneUploadInput");
const standaloneUploadStatus = document.getElementById("standaloneUploadStatus");
const standalonePhotosGrid = document.getElementById("standalonePhotosGrid");

let standalonePhotos = [];

async function loadStandalonePhotos() {

    standalonePhotosGrid.innerHTML = "<p style='color:#888;'>Loading…</p>";

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/photos`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Nem sikerült betölteni a képeket.");

        standalonePhotos = data.photos;
        renderStandaloneGrid();

    } catch (error) {

        standalonePhotosGrid.innerHTML = `<p style="color:#e06666;">${escapeHtml(error.message)}</p>`;

    }

}

function renderStandaloneGrid() {

    if (standalonePhotos.length === 0) {
        standalonePhotosGrid.innerHTML = "<p style='color:#888;'>No standalone photos yet.</p>";
        return;
    }

    standalonePhotosGrid.innerHTML = standalonePhotos.map((photo, index) => `
        <div class="portfolio-photo-item${photo.published ? "" : " is-unpublished"}" data-id="${photo.id}">
            <img src="${photo.thumbnailUrl}" alt="">
            <div class="portfolio-photo-controls">
                <div class="photo-ctrl-row">
                    <button class="photo-ctrl-btn" data-action="move-up" ${index === 0 ? "disabled" : ""} title="Move left">←</button>
                    <button class="photo-ctrl-btn" data-action="move-down" ${index === standalonePhotos.length - 1 ? "disabled" : ""} title="Move right">→</button>
                </div>
                <div class="photo-ctrl-row">
                    <button class="photo-ctrl-btn${photo.published ? " active" : ""}" data-action="toggle-publish" title="${photo.published ? "Published" : "Hidden"}">👁</button>
                    <button class="photo-ctrl-btn danger" data-action="delete" title="Delete">✕</button>
                </div>
            </div>
        </div>
    `).join("");

    standalonePhotosGrid.querySelectorAll(".portfolio-photo-item").forEach(item => {

        const id = Number(item.dataset.id);

        item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteStandalonePhoto(id));
        item.querySelector('[data-action="toggle-publish"]').addEventListener("click", () => toggleStandalonePublish(id));

        const moveUpBtn = item.querySelector('[data-action="move-up"]');
        const moveDownBtn = item.querySelector('[data-action="move-down"]');
        if (moveUpBtn) moveUpBtn.addEventListener("click", () => moveStandalonePhoto(id, -1));
        if (moveDownBtn) moveDownBtn.addEventListener("click", () => moveStandalonePhoto(id, 1));

    });

}

standaloneUploadInput.addEventListener("change", async () => {

    const files = Array.from(standaloneUploadInput.files);
    if (files.length === 0) return;

    standaloneUploadStatus.textContent = `Uploading ${files.length} photo(s)...`;

    const formData = new FormData();
    files.forEach(file => formData.append("photos", file));

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/photos`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${adminToken}` },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Feltöltés sikertelen.");

        standaloneUploadStatus.textContent = `✅ ${data.uploaded} uploaded, ${data.failed} failed.`;
        standaloneUploadInput.value = "";
        await loadStandalonePhotos();

    } catch (error) {

        standaloneUploadStatus.textContent = `❌ ${error.message}`;

    }

});

async function deleteStandalonePhoto(id) {

    if (!confirm("Delete this photo? This cannot be undone.")) return;

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/photos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Törlés sikertelen.");
        }

        await loadStandalonePhotos();

    } catch (error) {

        alert(error.message);

    }

}

async function toggleStandalonePublish(id) {

    const photo = standalonePhotos.find(p => p.id === id);
    if (!photo) return;

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/photos/${id}/publish`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ published: !photo.published })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Nem sikerült frissíteni.");
        }

        await loadStandalonePhotos();

    } catch (error) {

        alert(error.message);

    }

}

async function moveStandalonePhoto(id, direction) {

    const index = standalonePhotos.findIndex(p => p.id === id);
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= standalonePhotos.length) return;

    const reordered = [...standalonePhotos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    standalonePhotos = reordered;
    renderStandaloneGrid();

    try {

        await fetch(`${PORTFOLIO_API_BASE}/photos/reorder`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ orderedIds: reordered.map(p => p.id) })
        });

    } catch (error) {

        alert("Nem sikerült elmenteni a sorrendet: " + error.message);

    }

}

/* ==========================================
   PORTFOLIO — Albumok
   ========================================== */

const newAlbumBtn = document.getElementById("newAlbumBtn");
const albumsTableBody = document.getElementById("albumsTableBody");
const albumsEmpty = document.getElementById("albumsEmpty");

const albumFormModal = document.getElementById("albumFormModal");
const albumFormTitle = document.getElementById("albumFormTitle");
const albumForm = document.getElementById("albumForm");
const albumFormId = document.getElementById("albumFormId");
const albumTitleInput = document.getElementById("albumTitle");
const albumLocationInput = document.getElementById("albumLocation");
const albumDateInput = document.getElementById("albumDate");
const albumCategoryInput = document.getElementById("albumCategory");
const albumDescriptionInput = document.getElementById("albumDescription");
const albumPublishedInput = document.getElementById("albumPublished");
const cancelAlbumFormBtn = document.getElementById("cancelAlbumFormBtn");
const albumFormSubmitBtn = document.getElementById("albumFormSubmitBtn");
const albumFormStatus = document.getElementById("albumFormStatus");

const albumDetail = document.getElementById("albumDetail");
const albumDetailName = document.getElementById("albumDetailName");
const albumDetailMeta = document.getElementById("albumDetailMeta");
const editAlbumBtn = document.getElementById("editAlbumBtn");
const closeAlbumDetailBtn = document.getElementById("closeAlbumDetailBtn");
const albumPhotoUploadInput = document.getElementById("albumPhotoUploadInput");
const albumUploadStatus = document.getElementById("albumUploadStatus");
const albumPhotosGrid = document.getElementById("albumPhotosGrid");

let albums = [];
let currentAlbumId = null;
let currentAlbumPhotos = [];

async function loadAlbums() {

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/albums`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Nem sikerült betölteni az albumokat.");

        albums = data.albums;
        renderAlbumsTable();

    } catch (error) {

        alert(error.message);

    }

}

function renderAlbumsTable() {

    if (albums.length === 0) {
        albumsTableBody.innerHTML = "";
        albumsEmpty.hidden = false;
        return;
    }

    albumsEmpty.hidden = true;

    albumsTableBody.innerHTML = albums.map(album => `
        <tr>
            <td class="album-cover-cell">
                ${album.coverThumbnailUrl ? `<img src="${album.coverThumbnailUrl}" alt="">` : ""}
            </td>
            <td>${escapeHtml(album.title)}</td>
            <td>${escapeHtml(album.location || "—")}</td>
            <td>${escapeHtml(album.category || "—")}</td>
            <td>${album.photo_count}</td>
            <td><span class="status-badge ${album.published ? "status-active" : "status-expired"}">${album.published ? "published" : "hidden"}</span></td>
            <td>
                <div class="album-row-actions">
                    <button data-action="open" data-id="${album.id}">Open</button>
                    <button data-action="delete" data-id="${album.id}" class="danger">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    albumsTableBody.querySelectorAll('[data-action="open"]').forEach(btn => {
        btn.addEventListener("click", () => openAlbumDetail(Number(btn.dataset.id)));
    });

    albumsTableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteAlbum(Number(btn.dataset.id));
        });
    });

}

newAlbumBtn.addEventListener("click", () => openAlbumForm(null));

function openAlbumForm(album) {

    albumForm.reset();
    albumFormStatus.textContent = "";

    if (album) {
        albumFormTitle.textContent = "Edit Album";
        albumFormSubmitBtn.textContent = "Save Changes";
        albumFormId.value = album.id;
        albumTitleInput.value = album.title;
        albumLocationInput.value = album.location || "";
        albumDateInput.value = album.album_date ? album.album_date.split("T")[0] : "";
        albumCategoryInput.value = album.category || "";
        albumDescriptionInput.value = album.description || "";
        albumPublishedInput.checked = album.published;
    } else {
        albumFormTitle.textContent = "New Album";
        albumFormSubmitBtn.textContent = "Create Album";
        albumFormId.value = "";
        albumPublishedInput.checked = false;
    }

    albumFormModal.hidden = false;

}

cancelAlbumFormBtn.addEventListener("click", () => {
    albumFormModal.hidden = true;
});

albumForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const id = albumFormId.value;
    const payload = {
        title: albumTitleInput.value.trim(),
        location: albumLocationInput.value.trim() || null,
        date: albumDateInput.value || null,
        category: albumCategoryInput.value.trim() || null,
        description: albumDescriptionInput.value.trim() || null,
        published: albumPublishedInput.checked
    };

    albumFormSubmitBtn.disabled = true;
    albumFormStatus.textContent = "";

    try {

        const url = id ? `${PORTFOLIO_API_BASE}/albums/${id}` : `${PORTFOLIO_API_BASE}/albums`;
        const method = id ? "PATCH" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Nem sikerült menteni az albumot.");

        albumFormModal.hidden = true;
        await loadAlbums();

        if (id && currentAlbumId === Number(id)) {
            await openAlbumDetail(Number(id));
        }

    } catch (error) {

        albumFormStatus.textContent = error.message;

    } finally {

        albumFormSubmitBtn.disabled = false;

    }

});

async function deleteAlbum(id) {

    if (!confirm("Delete this album and all its photos? This cannot be undone.")) return;

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/albums/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Törlés sikertelen.");
        }

        if (currentAlbumId === id) {
            albumDetail.hidden = true;
            currentAlbumId = null;
        }

        await loadAlbums();

    } catch (error) {

        alert(error.message);

    }

}

async function openAlbumDetail(id) {

    currentAlbumId = id;

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/albums/${id}`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Nem sikerült betölteni az albumot.");

        const album = data.album;
        currentAlbumPhotos = data.photos;

        albumDetailName.textContent = album.title;
        albumDetailMeta.textContent =
            `${album.location || "No location"} · ${album.published ? "Published" : "Hidden"} · ${currentAlbumPhotos.length} photos`;

        editAlbumBtn.onclick = () => openAlbumForm(album);

        renderAlbumPhotosGrid();

        albumDetail.hidden = false;
        albumDetail.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {

        alert(error.message);

    }

}

closeAlbumDetailBtn.addEventListener("click", () => {
    albumDetail.hidden = true;
    currentAlbumId = null;
});

function renderAlbumPhotosGrid() {

    if (currentAlbumPhotos.length === 0) {
        albumPhotosGrid.innerHTML = "<p style='color:#888;'>No photos in this album yet.</p>";
        return;
    }

    albumPhotosGrid.innerHTML = currentAlbumPhotos.map((photo, index) => `
        <div class="portfolio-photo-item" data-id="${photo.id}">
            <img src="${photo.thumbnailUrl}" alt="">
            <div class="portfolio-photo-controls">
                <div class="photo-ctrl-row">
                    <button class="photo-ctrl-btn" data-action="move-up" ${index === 0 ? "disabled" : ""} title="Move left">←</button>
                    <button class="photo-ctrl-btn" data-action="move-down" ${index === currentAlbumPhotos.length - 1 ? "disabled" : ""} title="Move right">→</button>
                </div>
                <div class="photo-ctrl-row">
                    <button class="photo-ctrl-btn" data-action="set-cover" title="Set as cover">★</button>
                    <button class="photo-ctrl-btn danger" data-action="delete" title="Delete">✕</button>
                </div>
            </div>
        </div>
    `).join("");

    albumPhotosGrid.querySelectorAll(".portfolio-photo-item").forEach(item => {

        const id = Number(item.dataset.id);

        item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteAlbumPhoto(id));
        item.querySelector('[data-action="set-cover"]').addEventListener("click", () => setAlbumCover(id));

        const moveUpBtn = item.querySelector('[data-action="move-up"]');
        const moveDownBtn = item.querySelector('[data-action="move-down"]');
        if (moveUpBtn) moveUpBtn.addEventListener("click", () => moveAlbumPhoto(id, -1));
        if (moveDownBtn) moveDownBtn.addEventListener("click", () => moveAlbumPhoto(id, 1));

    });

}

albumPhotoUploadInput.addEventListener("change", async () => {

    const files = Array.from(albumPhotoUploadInput.files);
    if (files.length === 0 || !currentAlbumId) return;

    albumUploadStatus.textContent = `Uploading ${files.length} photo(s)...`;

    const formData = new FormData();
    files.forEach(file => formData.append("photos", file));

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/albums/${currentAlbumId}/photos`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${adminToken}` },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Feltöltés sikertelen.");

        albumUploadStatus.textContent = `✅ ${data.uploaded} uploaded, ${data.failed} failed.`;
        albumPhotoUploadInput.value = "";
        await openAlbumDetail(currentAlbumId);
        await loadAlbums();

    } catch (error) {

        albumUploadStatus.textContent = `❌ ${error.message}`;

    }

});

async function deleteAlbumPhoto(photoId) {

    if (!confirm("Delete this photo from the album?")) return;

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/albums/${currentAlbumId}/photos/${photoId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Törlés sikertelen.");
        }

        await openAlbumDetail(currentAlbumId);
        await loadAlbums();

    } catch (error) {

        alert(error.message);

    }

}

async function setAlbumCover(photoId) {

    try {

        const response = await fetch(`${PORTFOLIO_API_BASE}/albums/${currentAlbumId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ cover_photo_id: photoId })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Nem sikerült beállítani a borítóképet.");
        }

        await loadAlbums();
        alert("Cover photo updated.");

    } catch (error) {

        alert(error.message);

    }

}

async function moveAlbumPhoto(photoId, direction) {

    const index = currentAlbumPhotos.findIndex(p => p.id === photoId);
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= currentAlbumPhotos.length) return;

    const reordered = [...currentAlbumPhotos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    currentAlbumPhotos = reordered;
    renderAlbumPhotosGrid();

    try {

        await fetch(`${PORTFOLIO_API_BASE}/albums/${currentAlbumId}/photos/reorder`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ orderedIds: reordered.map(p => p.id) })
        });

    } catch (error) {

        alert("Nem sikerült elmenteni a sorrendet: " + error.message);

    }

}
