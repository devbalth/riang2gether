const searchInput = document.getElementById("searchInput");

if (searchInput) {

    const allVideos = document.querySelectorAll(".video");

    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();

        allVideos.forEach(video => {
            const title = video.querySelector(".video-title").textContent.toLowerCase();

            if (title.includes(filter)) {
                video.style.display = "block"; 
            } else {
                video.style.display = "none";  
            }
        });
    });
}