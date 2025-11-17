document.querySelectorAll(".like-btn").forEach(icon => {
    icon.addEventListener("click", () => {

        icon.classList.toggle("active");

        if (icon.classList.contains("active")) {
            icon.classList.remove("bx-like");
            icon.classList.add("bxs-like");
        } else {
            icon.classList.remove("bxs-like");
            icon.classList.add("bx-like");
        }
    });
});