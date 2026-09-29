/* ==========================================================
   Worldwide QSL Gallery
========================================================== */

const galleryContainer = document.getElementById("galleryContainer");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const imageCaption = document.getElementById("imageCaption");
const imageLoader = document.getElementById("imageLoader");
const imageStage = document.getElementById("imageStage");
const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const overlay = document.getElementById("overlay");

let galleryData = {};
let imageList = [];
let currentIndex = 0;
let loadToken = 0;
let previousBodyOverflow = "";

const zoom = { scale: 1, min: 1, max: 4, x: 0, y: 0, pointers: new Map(), pinchStartDistance: 0, pinchStartScale: 1, dragStartX: 0, dragStartY: 0, dragOriginX: 0, dragOriginY: 0, moved: false };

async function loadGallery() {
    try {
        const response = await fetch("data/gallery.json");
        if (!response.ok) throw new Error(`Gallery request failed (${response.status})`);
        galleryData = await response.json();
        buildGallery();
    } catch (err) {
        console.error("Gallery Error:", err);
        galleryContainer.innerHTML = `
            <h2 style="text-align:center;color:#ff5555;">Unable to load gallery.json</h2>
            <p style="text-align:center;color:#ccc;">Check that data/gallery.json is valid and available.</p>`;
    }
}

function buildGallery() {
    galleryContainer.innerHTML = "";
    imageList = [];
    const years = Object.keys(galleryData).sort((a, b) => Number(b) - Number(a));

    years.forEach((year) => {
        const entries = Array.isArray(galleryData[year]) ? galleryData[year] : [];
        const section = document.createElement("section");
        section.className = "year-section";

        const title = document.createElement("h2");
        title.className = "year-title";
        title.textContent = `${year} (${entries.length})`;

        const grid = document.createElement("div");
        grid.className = "gallery-grid";

        entries.forEach((item) => {
            const imagePath = `images/${year}/${item.file}`;
            const record = { src: imagePath, callsign: item.callsign || "", title: item.title || "", year: String(year) };
            const imageIndex = imageList.push(record) - 1;
            const card = document.createElement("div");
            card.className = "gallery-item";

            const img = document.createElement("img");
            img.src = imagePath;
            img.alt = record.callsign;
            img.loading = "lazy";
            img.decoding = "async";
            img.draggable = false;

            const caption = document.createElement("div");
            caption.className = "caption";
            caption.textContent = record.callsign;

            card.append(img, caption);
            card.addEventListener("click", () => openLightbox(imageIndex));
            grid.appendChild(card);
        });

        section.append(title, grid);
        galleryContainer.appendChild(section);
    });

    observeCards();
}

let cardObserver;
function observeCards() {
    if (!("IntersectionObserver" in window)) {
        document.querySelectorAll(".gallery-item").forEach((card) => card.classList.add("is-visible"));
        return;
    }
    if (!cardObserver) {
        cardObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "80px" });
    }
    document.querySelectorAll(".gallery-item:not(.is-visible)").forEach((card) => cardObserver.observe(card));
}

function openLightbox(index) {
    if (!imageList.length) return;
    currentIndex = index;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lightbox.classList.remove("hidden");
    lightbox.setAttribute("aria-hidden", "false");
    updateLightbox();
    closeBtn.focus({ preventScroll: true });
}

function updateLightbox() {
    const item = imageList[currentIndex];
    if (!item) return;
    resetZoom();
    const token = ++loadToken;
    lightboxImage.classList.add("is-loading");
    imageLoader.classList.add("is-visible");
    lightboxImage.onload = () => {
        if (token !== loadToken) return;
        lightboxImage.classList.remove("is-loading");
        imageLoader.classList.remove("is-visible");
    };
    lightboxImage.onerror = () => {
        if (token !== loadToken) return;
        lightboxImage.classList.remove("is-loading");
        imageLoader.classList.remove("is-visible");
    };
    lightboxImage.alt = item.callsign ? `QSL card for ${item.callsign}` : "QSL Card";
    lightboxImage.src = item.src;

    imageCaption.replaceChildren();
    const callsign = document.createElement("span");
    callsign.className = "caption-callsign";
    callsign.textContent = item.callsign;
    const title = document.createElement("span");
    title.className = "caption-title";
    title.textContent = item.title;
    const year = document.createElement("span");
    year.className = "caption-year";
    year.textContent = item.year;
    imageCaption.append(callsign, title, year);

    preloadAdjacentImages();
}

function closeLightbox() {
    if (lightbox.classList.contains("hidden")) return;
    lightbox.classList.add("hidden");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    resetZoom();
}

function previousImage() {
    if (!imageList.length) return;
    currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
    updateLightbox();
}

function nextImage() {
    if (!imageList.length) return;
    currentIndex = (currentIndex + 1) % imageList.length;
    updateLightbox();
}

function preloadAdjacentImages() {
    if (imageList.length < 2) return;
    [-1, 1].forEach((offset) => {
        const adjacent = imageList[(currentIndex + offset + imageList.length) % imageList.length];
        const preload = new Image();
        preload.decoding = "async";
        preload.src = adjacent.src;
    });
}

function applyZoom() {
    lightboxImage.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
    lightboxImage.classList.toggle("is-zoomed", zoom.scale > 1);
}

function resetZoom() {
    zoom.scale = 1;
    zoom.x = 0;
    zoom.y = 0;
    zoom.pointers.clear();
    zoom.pinchStartDistance = 0;
    lightboxImage.classList.remove("is-dragging");
    applyZoom();
}

function setZoom(scale, focalX = 0, focalY = 0) {
    const nextScale = Math.max(zoom.min, Math.min(zoom.max, scale));
    if (nextScale === zoom.scale) return;
    const ratio = nextScale / zoom.scale;
    zoom.x = focalX - (focalX - zoom.x) * ratio;
    zoom.y = focalY - (focalY - zoom.y) * ratio;
    zoom.scale = nextScale;
    applyZoom();
}

closeBtn.addEventListener("click", closeLightbox);
overlay.addEventListener("click", closeLightbox);
prevBtn.addEventListener("click", previousImage);
nextBtn.addEventListener("click", nextImage);

document.addEventListener("keydown", (event) => {
    if (lightbox.classList.contains("hidden")) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); previousImage(); }
    else if (event.key === "ArrowRight") { event.preventDefault(); nextImage(); }
    else if (event.key === "Escape") { event.preventDefault(); closeLightbox(); }
});

imageStage.addEventListener("wheel", (event) => {
    if (lightbox.classList.contains("hidden")) return;
    event.preventDefault();
    const rect = imageStage.getBoundingClientRect();
    setZoom(zoom.scale * (event.deltaY < 0 ? 1.18 : 1 / 1.18), event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
}, { passive: false });

imageStage.addEventListener("dblclick", (event) => {
    event.preventDefault();
    if (zoom.scale > 1) resetZoom();
    else setZoom(2, 0, 0);
});

imageStage.addEventListener("pointerdown", (event) => {
    if (lightbox.classList.contains("hidden")) return;
    imageStage.setPointerCapture(event.pointerId);
    zoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (zoom.pointers.size === 2) {
        const points = [...zoom.pointers.values()];
        zoom.pinchStartDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        zoom.pinchStartScale = zoom.scale;
    } else if (zoom.scale > 1) {
        zoom.dragStartX = event.clientX;
        zoom.dragStartY = event.clientY;
        zoom.dragOriginX = zoom.x;
        zoom.dragOriginY = zoom.y;
        zoom.moved = false;
        lightboxImage.classList.add("is-dragging");
    }
});

imageStage.addEventListener("pointermove", (event) => {
    if (!zoom.pointers.has(event.pointerId)) return;
    zoom.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (zoom.pointers.size >= 2 && zoom.pinchStartDistance) {
        const points = [...zoom.pointers.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const centerX = (points[0].x + points[1].x) / 2;
        const centerY = (points[0].y + points[1].y) / 2;
        const rect = imageStage.getBoundingClientRect();
        setZoom(zoom.pinchStartScale * distance / zoom.pinchStartDistance, centerX - (rect.left + rect.width / 2), centerY - (rect.top + rect.height / 2));
    } else if (zoom.scale > 1) {
        const dx = event.clientX - zoom.dragStartX;
        const dy = event.clientY - zoom.dragStartY;
        if (Math.abs(dx) + Math.abs(dy) > 3) zoom.moved = true;
        zoom.x = zoom.dragOriginX + dx;
        zoom.y = zoom.dragOriginY + dy;
        applyZoom();
    }
});

function endPointer(event) {
    zoom.pointers.delete(event.pointerId);
    if (zoom.pointers.size < 2) zoom.pinchStartDistance = 0;
    if (!zoom.pointers.size) lightboxImage.classList.remove("is-dragging");
}
imageStage.addEventListener("pointerup", endPointer);
imageStage.addEventListener("pointercancel", endPointer);

let lastTap = 0;
imageStage.addEventListener("touchend", (event) => {
    if (event.changedTouches.length !== 1 || zoom.moved) return;
    const now = Date.now();
    if (now - lastTap < 300) resetZoom();
    lastTap = now;
}, { passive: true });

let touchStartX = 0;
let touchStartY = 0;
lightbox.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
}, { passive: true });
lightbox.addEventListener("touchend", (event) => {
    if (event.changedTouches.length !== 1 || zoom.scale > 1) return;
    const dx = touchStartX - event.changedTouches[0].clientX;
    const dy = touchStartY - event.changedTouches[0].clientY;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx > 0) nextImage(); else previousImage();
}, { passive: true });

document.addEventListener("contextmenu", (event) => {
    if (event.target.tagName === "IMG") event.preventDefault();
});
document.addEventListener("dragstart", (event) => {
    if (event.target.tagName === "IMG") event.preventDefault();
});

loadGallery();
