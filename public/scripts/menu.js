const menuBtn = document.querySelector(".bx-menu");
const sideMenu = document.getElementById("side-menu");
const overlay = document.getElementById("overlay");


menuBtn.addEventListener("click", () => {
    sideMenu.classList.add("open");
    overlay.classList.add("show");
});


overlay.addEventListener("click", () => {
    sideMenu.classList.remove("open");
    overlay.classList.remove("show");
});
