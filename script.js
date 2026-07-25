/* ==========================================================
   Worldwide QSL Gallery
   script.js (Part 1)
========================================================== */

const galleryContainer = document.getElementById("galleryContainer");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const imageCaption = document.getElementById("imageCaption");

const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const overlay = document.getElementById("overlay");


/* ==========================================================
   VARIABLES
========================================================== */

let galleryData = {};

let imageList = [];

let currentIndex = 0;


/* ==========================================================
   LOAD JSON
========================================================== */

async function loadGallery() {

    try {

        const response = await fetch("data/gallery.json");

        galleryData = await response.json();

        buildGallery();

    }

catch (err) {

    console.error("Gallery Error:", err);

    galleryContainer.innerHTML = `
        <h2 style="text-align:center;color:#ff5555;">
            Unable to load gallery.json
        </h2>
        <p style="text-align:center;color:#ccc;">
            Check browser console (F12)
        </p>
    `;
}

}


/* ==========================================================
   BUILD GALLERY
========================================================== */

function buildGallery() {

    galleryContainer.innerHTML = "";

    imageList = [];

    // newest year first

    const years = Object.keys(galleryData).sort((a,b)=>b-a);

    years.forEach(year=>{

        const section = document.createElement("section");

        section.className = "year-section";


        const title = document.createElement("h2");

        title.className = "year-title";

        title.textContent = year;


        const grid = document.createElement("div");

        grid.className = "gallery-grid";


        galleryData[year].forEach(item=>{

            const imagePath =
                `images/${year}/${item.file}`;

            const card = document.createElement("div");

            card.className = "gallery-item";


            const img = document.createElement("img");

            img.src = imagePath;

            img.alt = item.callsign;

            img.loading = "lazy";

            img.draggable = false;


            const caption = document.createElement("div");

            caption.className = "caption";

            caption.textContent = item.callsign;


            card.appendChild(img);

            card.appendChild(caption);

            grid.appendChild(card);


            imageList.push({

                src:imagePath,

                callsign:item.callsign,

                year:year

            });


            const imageIndex = imageList.length - 1;

            card.addEventListener("click",()=>{

                openLightbox(imageIndex);

            });

        });


        section.appendChild(title);

        section.appendChild(grid);

        galleryContainer.appendChild(section);

    });

}


/* ==========================================================
   OPEN LIGHTBOX
========================================================== */

function openLightbox(index){

    currentIndex = index;

    updateLightbox();

    lightbox.classList.remove("hidden");

    document.body.style.overflow = "hidden";

}


/* ==========================================================
   UPDATE IMAGE
========================================================== */

function updateLightbox(){

    const img = imageList[currentIndex];

    lightboxImage.src = img.src;

    lightboxImage.alt = img.callsign;

    imageCaption.textContent =
        `${img.callsign} • ${img.year}`;

}


/* ==========================================================
   CLOSE
========================================================== */

function closeLightbox(){

    lightbox.classList.add("hidden");

    document.body.style.overflow = "auto";

}


/* ==========================================================
   BUTTON EVENTS
========================================================== */

closeBtn.addEventListener("click",closeLightbox);

overlay.addEventListener("click",closeLightbox);


/* ==========================================================
   START
========================================================== */

loadGallery();

/* ==========================================================
   PREVIOUS
========================================================== */

function previousImage() {

    currentIndex--;

    if (currentIndex < 0) {

        currentIndex = imageList.length - 1;

    }

    updateLightbox();

}


/* ==========================================================
   NEXT
========================================================== */

function nextImage() {

    currentIndex++;

    if (currentIndex >= imageList.length) {

        currentIndex = 0;

    }

    updateLightbox();

}


/* ==========================================================
   BUTTON EVENTS
========================================================== */

prevBtn.addEventListener("click", previousImage);

nextBtn.addEventListener("click", nextImage);


/* ==========================================================
   KEYBOARD
========================================================== */

document.addEventListener("keydown", (e) => {

    if (lightbox.classList.contains("hidden"))
        return;

    switch (e.key) {

        case "ArrowLeft":
            previousImage();
            break;

        case "ArrowRight":
            nextImage();
            break;

        case "Escape":
            closeLightbox();
            break;
    }

});


/* ==========================================================
   TOUCH SWIPE
========================================================== */

let touchStartX = 0;
let touchEndX = 0;

lightbox.addEventListener("touchstart", (e) => {

    touchStartX = e.changedTouches[0].clientX;

}, { passive: true });

lightbox.addEventListener("touchend", (e) => {

    touchEndX = e.changedTouches[0].clientX;

    handleSwipe();

}, { passive: true });


function handleSwipe() {

    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) < 50)
        return;

    if (distance > 0) {

        nextImage();

    }
    else {

        previousImage();

    }

}


/* ==========================================================
   RIGHT CLICK PROTECTION
========================================================== */

document.addEventListener("contextmenu", function (e) {

    if (e.target.tagName === "IMG") {

        e.preventDefault();

    }

});


/* ==========================================================
   DRAG PROTECTION
========================================================== */

document.addEventListener("dragstart", function (e) {

    if (e.target.tagName === "IMG") {

        e.preventDefault();

    }

});


/* ==========================================================
   FADE-IN ANIMATION
========================================================== */

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.style.opacity = 1;

            entry.target.style.transform = "translateY(0)";

        }

    });

}, {
    threshold: 0.15
});


function observeCards() {

    document.querySelectorAll(".gallery-item").forEach(card => {

        card.style.opacity = 0;

        card.style.transform = "translateY(20px)";

        card.style.transition =
            "opacity .6s ease, transform .6s ease";

        observer.observe(card);

    });

}


/* ==========================================================
   REBUILD OBSERVER
========================================================== */

const originalBuildGallery = buildGallery;

buildGallery = function () {

    originalBuildGallery();

    observeCards();

};


/* ==========================================================
   IMAGE PROTECTION
========================================================== */

lightboxImage.setAttribute("draggable", "false");

lightboxImage.addEventListener("dragstart", e => {

    e.preventDefault();

});


/* ==========================================================
   DISABLE LONG PRESS (Mobile)
========================================================== */

lightboxImage.style.webkitTouchCallout = "none";

lightboxImage.style.webkitUserSelect = "none";


/* ==========================================================
   PRELOAD NEXT IMAGE
========================================================== */

function preloadNextImage() {

    const next = (currentIndex + 1) % imageList.length;

    const img = new Image();

    img.src = imageList[next].src;

}


const originalUpdateLightbox = updateLightbox;

updateLightbox = function () {

    originalUpdateLightbox();

    preloadNextImage();

};


/* ==========================================================
   END
========================================================== */
