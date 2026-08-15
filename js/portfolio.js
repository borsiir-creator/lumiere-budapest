/* ==========================================
   LUMIÈRE BUDAPEST — portfolio.js
   A publikus Portfolio szekció dinamikus betöltése
   (önálló képek + album borítók), és a hozzá tartozó
   lightbox (albumon belül is lapozható).
========================================== */

const PORTFOLIO_API = "https://lumiere-budapest-backend.onrender.com/api/portfolio/public";

const portfolioGrid = document.getElementById("portfolioGrid");

const pLightbox = document.getElementById("lightbox");
const pLightboxImage = document.getElementById("lightboxImage");
const pLightboxCaption = document.getElementById("lightboxCaption");
const pLightboxClose = document.getElementById("lightboxClose");
const pLightboxPrev = document.getElementById("lightboxPrev");
const pLightboxNext = document.getElementById("lightboxNext");

let currentSet = [];      // az éppen böngészett kép-halmaz (önálló képek VAGY egy album képei)
let currentIndex = 0;
let currentCaptionPrefix = ""; // pl. album cím, vagy üres önálló képeknél

// ------------------------------------------
// BETÖLTÉS
// ------------------------------------------

(async function loadPublicPortfolio() {

    try {

        const response = await fetch(PORTFOLIO_API);

        if (!response.ok) return; // csendben hagyjuk a statikus CTA-t, ha bármi hiba van

        const data = await response.json();

        const hasContent = (data.standalonePhotos && data.standalonePhotos.length > 0)
            || (data.albums && data.albums.length > 0);

        if (!hasContent) return; // marad az üres/rejtett rács, csak a CTA látszik

        renderGrid(data.standalonePhotos || [], data.albums || []);
        portfolioGrid.hidden = false;

    } catch (error) {

        // Csendben hagyjuk a meglévő statikus tartalmat, ha a backend
        // épp nem elérhető (pl. Render "elalvás") — ne törjön el az oldal.
        console.warn("Portfolio betöltése sikertelen:", error.message);

    }

})();

function renderGrid(standalonePhotos, albums) {

    let html = "";

    standalonePhotos.forEach((photo, index) => {

        html += `
            <div class="portfolio-item reveal" data-type="standalone" data-index="${index}">
                <img src="${photo.thumbnailUrl}" alt="Portfolio photo" loading="lazy">
            </div>
        `;

    });

    albums.forEach((album) => {

        html += `
            <div class="portfolio-item portfolio-album-card reveal" data-type="album" data-album-id="${album.id}">
                <img src="${album.coverThumbnailUrl || album.coverUrl || ""}" alt="${escapeHtml(album.title)}" loading="lazy">
                <div class="portfolio-album-overlay">
                    <span class="portfolio-album-title">${escapeHtml(album.title)}</span>
                    <span class="portfolio-album-count">${album.photoCount} photo${album.photoCount === 1 ? "" : "s"}</span>
                </div>
            </div>
        `;

    });

    portfolioGrid.innerHTML = html;

    // Kattintás-kezelők
    portfolioGrid.querySelectorAll('[data-type="standalone"]').forEach((el) => {

        el.addEventListener("click", () => {

            currentSet = standalonePhotos.map(p => ({ url: p.displayUrl }));
            currentCaptionPrefix = "";
            openLightboxAt(Number(el.dataset.index));

        });

    });

    portfolioGrid.querySelectorAll('[data-type="album"]').forEach((el) => {

        el.addEventListener("click", () => openAlbum(Number(el.dataset.albumId)));

    });

}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

// ------------------------------------------
// ALBUM MEGNYITÁSA (saját képeivel tölti fel a lightboxot)
// ------------------------------------------

async function openAlbum(albumId) {

    try {

        const response = await fetch(`${PORTFOLIO_API}/albums/${albumId}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Nem sikerült betölteni az albumot.");

        currentSet = data.photos.map(p => ({ url: p.displayUrl }));
        currentCaptionPrefix = data.album.title
            + (data.album.location ? ` — ${data.album.location}` : "");

        openLightboxAt(0);

    } catch (error) {

        alert(error.message);

    }

}

// ------------------------------------------
// LIGHTBOX
// ------------------------------------------

function openLightboxAt(index) {

    currentIndex = index;
    renderLightbox();
    pLightbox.classList.add("open");

}

function closeLightbox() {
    pLightbox.classList.remove("open");
}

function renderLightbox() {

    const item = currentSet[currentIndex];
    if (!item) return;

    pLightboxImage.src = item.url;
    pLightboxImage.alt = currentCaptionPrefix || "Portfolio photo";

    const position = `${currentIndex + 1} / ${currentSet.length}`;
    pLightboxCaption.textContent = currentCaptionPrefix
        ? `${currentCaptionPrefix} · ${position}`
        : position;

}

function showLightboxImage(index) {

    if (index < 0) index = currentSet.length - 1;
    if (index >= currentSet.length) index = 0;

    currentIndex = index;
    renderLightbox();

}

if (pLightbox) {

    pLightboxClose.addEventListener("click", closeLightbox);
    pLightboxPrev.addEventListener("click", () => showLightboxImage(currentIndex - 1));
    pLightboxNext.addEventListener("click", () => showLightboxImage(currentIndex + 1));

    pLightbox.addEventListener("click", (event) => {
        if (event.target === pLightbox) closeLightbox();
    });

    document.addEventListener("keydown", (event) => {

        if (!pLightbox.classList.contains("open")) return;

        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") showLightboxImage(currentIndex - 1);
        if (event.key === "ArrowRight") showLightboxImage(currentIndex + 1);

    });

}
