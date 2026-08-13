/* ==========================================
   LUMIÈRE BUDAPEST — admin.js
========================================== */

const API_BASE = "https://lumiere-budapest-backend.onrender.com/api/admin";
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
