const messages = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = `msg ${cls}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

sendBtn.onclick = () => {
  const text = input.value.trim();
  if (!text) return;

  addMessage("你：" + text, "user");
  input.value = "";

  setTimeout(() => {
    addMessage("橘猫：喵～猫猫--呆。", "cat");
  }, 400);
};

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
