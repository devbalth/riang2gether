const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let messages = JSON.parse(localStorage.getItem("chatMessages")) || [
    "Anybody up for Tai Chi session on Monday?"
];

function displayMessages() {
    chatBox.innerHTML = "";
    messages.forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("message");
        div.textContent = msg;
        chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}
displayMessages();

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messages.push(text);
    localStorage.setItem("chatMessages", JSON.stringify(messages));

    displayMessages();
    messageInput.value = "";
}
