// Данные приходят только из main через мост: renderer не ходит в сеть сам
const card = document.getElementById("card");
const statusText = document.getElementById("statusText");
const nameEl = document.getElementById("name");
const uidEl = document.getElementById("uid");
const rolesEl = document.getElementById("roles");
const sessionEl = document.getElementById("sessionId");
const warnEl = document.getElementById("warn");

function render(state) {
  card.className = "card is-" + (state.status || "connecting");
  statusText.textContent = state.message || "";

  if (state.username) nameEl.textContent = state.username;
  uidEl.textContent = state.userId ? "ID " + state.userId : "";
  sessionEl.textContent = state.sessionId || "—";

  rolesEl.innerHTML = "";
  for (const role of state.roles || []) {
    const chip = document.createElement("span");
    chip.className = "role";
    chip.textContent = role;
    rolesEl.appendChild(chip);
  }

  warnEl.textContent = state.warning || "";
  warnEl.classList.toggle("show", Boolean(state.warning));
}

if (window.aspect) {
  window.aspect.onState(render);
  document.getElementById("quit").addEventListener("click", () => window.aspect.quit());
}
