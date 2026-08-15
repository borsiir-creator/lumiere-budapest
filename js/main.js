/* ==========================================
   LUMIÈRE BUDAPEST
   main.js
========================================== */

// =======================
// SCROLL REVEAL ANIMÁCIÓ
// =======================

let revealObserver = null;

function initReveal(elements){

    if(!elements.length) return;

    if("IntersectionObserver" in window){

        // Csak most kapcsoljuk be a "rejtsd el induláskor" CSS-t — ha idáig
        // eljutott a script, biztosan tudjuk animálni is.
        document.documentElement.classList.add("js-ready");

        if(!revealObserver){

            revealObserver = new IntersectionObserver((entries, observer) => {

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

        }

        elements.forEach(element => {

            revealObserver.observe(element);

        });

        // Biztonsági háló: ha bármi okból (pl. az elem sosem kerül a
        // viewportba, vagy az observer nem indul el megfelelően) egy elem
        // 4 másodperc után sem vált láthatóvá, kényszerítsük ki.
        setTimeout(() => {

            elements.forEach(element => {

                element.classList.add("in-view");

            });

        }, 4000);

    }

}

// Elérhetővé tesszük más scripteknek is (pl. portfolio.js), hogy a
// később, dinamikusan beszúrt .reveal elemeket is be tudják jelentkeztetni
// ugyanebbe az observerbe.
window.lumiereInitReveal = initReveal;

initReveal(Array.from(document.querySelectorAll(".reveal")));

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

// A Portfolio lightbox logikáját mostantól a js/portfolio.js kezeli
// (dinamikusan betöltött képekhez/albumokhoz igazítva).

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
