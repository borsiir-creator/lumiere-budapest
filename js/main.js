/* ==========================================
   LUMIÈRE BUDAPEST
   main.js
========================================== */

// =======================
// SCROLL REVEAL ANIMÁCIÓ
// =======================

const revealElements = document.querySelectorAll(".reveal");

if(revealElements.length && "IntersectionObserver" in window){

    // Csak most kapcsoljuk be a "rejtsd el induláskor" CSS-t — ha idáig
    // eljutott a script, biztosan tudjuk animálni is.
    document.documentElement.classList.add("js-ready");

    const revealObserver = new IntersectionObserver((entries, observer) => {

        entries.forEach(entry => {

            if(entry.isIntersecting){

                entry.target.classList.add("in-view");
                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px"
    });

    revealElements.forEach(element => {

        revealObserver.observe(element);

    });

    // Biztonsági háló: ha bármi okból (pl. az elem sosem kerül a
    // viewportba, vagy az observer nem indul el megfelelően) egy elem
    // 4 másodperc után sem vált láthatóvá, kényszerítsük ki.
    setTimeout(() => {

        revealElements.forEach(element => {

            element.classList.add("in-view");

        });

    }, 4000);

}

// =======================
// HAMBURGER MENU (mobil)
// =======================

const hamburger = document.querySelector(".hamburger");
const mobileNav = document.querySelector("nav");

if (hamburger && mobileNav) {

    hamburger.addEventListener("click", () => {

        hamburger.classList.toggle("open");
        mobileNav.classList.toggle("open");

    });

    // menü bezárása linkre kattintva
    mobileNav.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            hamburger.classList.remove("open");
            mobileNav.classList.remove("open");

        });

    });

}

// =======================
// NAVBAR SCROLL
// =======================

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (window.scrollY > 60) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }

});

// =======================
// HERO SLIDER
// =======================

const slides = document.querySelectorAll(".slide");

let currentSlide = 0;

const directions = [
    "move-right",
    "move-left",
    "move-up",
    "move-down",
    "move-right"
];

slides.forEach((slide, index) => {

    slide.classList.add(directions[index % directions.length]);

});

function showSlide(index){

    slides.forEach(slide => {

        slide.classList.remove("active");

    });

    slides[index].classList.add("active");

}

function nextSlide(){

    currentSlide++;

    if(currentSlide >= slides.length){

        currentSlide = 0;

    }

    showSlide(currentSlide);

}

setInterval(nextSlide, 6000);

// =======================
// PORTFOLIO LIGHTBOX
// =======================

const galleryImages = document.querySelectorAll(".portfolio-item img");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");

let currentImageIndex = 0;

function openLightbox(index){

    currentImageIndex = index;
    lightboxImage.src = galleryImages[index].src;
    lightboxImage.alt = galleryImages[index].alt;
    lightbox.classList.add("open");

}

function closeLightbox(){

    lightbox.classList.remove("open");

}

function showImage(index){

    if(index < 0){
        index = galleryImages.length - 1;
    }

    if(index >= galleryImages.length){
        index = 0;
    }

    currentImageIndex = index;
    lightboxImage.src = galleryImages[index].src;
    lightboxImage.alt = galleryImages[index].alt;

}

if(galleryImages.length && lightbox){

    galleryImages.forEach((img, index) => {

        img.addEventListener("click", () => openLightbox(index));

    });

    lightboxClose.addEventListener("click", closeLightbox);

    lightboxPrev.addEventListener("click", () => showImage(currentImageIndex - 1));

    lightboxNext.addEventListener("click", () => showImage(currentImageIndex + 1));

    lightbox.addEventListener("click", (event) => {

        if(event.target === lightbox){
            closeLightbox();
        }

    });

    document.addEventListener("keydown", (event) => {

        if(!lightbox.classList.contains("open")){
            return;
        }

        if(event.key === "Escape"){
            closeLightbox();
        }

        if(event.key === "ArrowLeft"){
            showImage(currentImageIndex - 1);
        }

        if(event.key === "ArrowRight"){
            showImage(currentImageIndex + 1);
        }

    });

}

// =======================
// CONTACT FORM
// =======================

// Éles backend URL (Render.com-on hosztolva)
// Fejlesztéshez / helyi teszteléshez cseréld vissza erre:
// const CONTACT_API_URL = "http://localhost:3000/api/contact";
const CONTACT_API_URL = "https://lumiere-budapest-backend.onrender.com/api/contact";

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

if(contactForm){

    contactForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const submitButton = contactForm.querySelector("button[type='submit']");
        const formData = new FormData(contactForm);

        const payload = {
            name: formData.get("name"),
            email: formData.get("email"),
            subject: formData.get("subject"),
            message: formData.get("message")
        };

        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
        formStatus.textContent = "";
        formStatus.style.color = "#C8A96A";

        try {

            const response = await fetch(CONTACT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if(!response.ok){
                throw new Error(data.error || "Ismeretlen hiba történt.");
            }

            formStatus.textContent = "Thank you! Your message has been sent — I'll get back to you soon.";
            contactForm.reset();

        } catch (error) {

            formStatus.style.color = "#e06666";
            formStatus.textContent = "Hiba történt az üzenet küldésekor. Kérlek próbáld újra, vagy írj közvetlenül emailben.";

        } finally {

            submitButton.disabled = false;
            submitButton.textContent = "Send Message";

        }

    });

}