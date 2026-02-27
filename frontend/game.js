const API_URL = "http://127.0.0.1:8000";
const USER_ID = 1;

let words = [];
let currentWord = null;
let streak = 0;
let previousLevel = null;

/* =========================
   KULLANICI YÜKLE
========================= */
async function loadUser() {
  const res = await fetch(`${API_URL}/users`);
  const data = await res.json();

  const user = data.find(u => u.id === USER_ID);
  if (!user) return;

  const levelEl = document.getElementById("level");
  const scoreEl = document.getElementById("score");
  const xpBar = document.getElementById("xpBar");

  levelEl.innerText = user.level;
  scoreEl.innerText = user.total_score;

  // 🔥 LEVEL UP MODAL KONTROLÜ
  if (user.level > previousLevel) {

  if (user.level >= 23) {
    setTimeout(() => {
      startMatching();
    }, 800);
  }

  if (previousLevel === null) {
  previousLevel = user.level;
}
}

  // 🔓 MOD UNLOCK KONTROLÜ
  if (user.level >= 5) {
    const matchingBtn = document.getElementById("matchingBtn");
    if (matchingBtn) matchingBtn.style.display = "block";
  }

  if (user.level >= 10) {
    const voiceBtn = document.getElementById("voiceBtn");
    if (voiceBtn) voiceBtn.style.display = "block";
  }

  // XP BAR
  const xpInLevel = user.total_score % 30;
  const percent = (xpInLevel / 30) * 100;
  xpBar.style.width = percent + "%";

  // LEVEL ANİMASYONU
  if (xpInLevel === 0 && user.total_score !== 0) {
    levelEl.classList.add("level-up");
    setTimeout(() => {
      levelEl.classList.remove("level-up");
    }, 600);
  }
}

/* =========================
   KELİMELERİ ÇEK
========================= */
async function loadWords() {
  const res = await fetch(
    `${API_URL}/words/random?user_id=${USER_ID}&limit=5`
  );
  words = await res.json();
  nextWord();
}

/* =========================
   KELİME MASKELE
========================= */
function maskWord(word) {
  return word
    .split("")
    .map((letter, index) =>
      index % 2 === 0 ? letter : "_"
    )
    .join(" ");
}

/* =========================
   SIRADAKİ KELİME
========================= */
function nextWord() {
  const wordEl = document.getElementById("word");
  const restartBtn = document.getElementById("restartBtn");
  const input = document.getElementById("answerInput");
  const feedback = document.getElementById("feedback");
  const img = document.getElementById("wordImage");

  feedback.innerText = "";
  input.value = "";

  if (words.length === 0) {
    wordEl.innerText = "🎉 Tebrikler!\nBu turu bitirdin!";
    restartBtn.style.display = "block";
    currentWord = null;
    return;
  }

  restartBtn.style.display = "none";
  currentWord = words.pop();

  wordEl.innerText = maskWord(currentWord.word);

const wordName = currentWord.word
  .toLowerCase()
  .replace(/\s+/g, "_");

img.src = API_URL + "/assets/words/" + wordName + ".jpg";

img.onerror = function() {
  img.onerror = null;
  img.src = API_URL + "/assets/default.jpg";
};
}

/* =========================
   CEVAP KONTROL
========================= */
async function checkAnswer() {
  if (!currentWord) return;

  const inputEl = document.getElementById("answerInput");
  const feedback = document.getElementById("feedback");
  const wordEl = document.getElementById("word");

  const input = inputEl.value.trim().toLowerCase();
  const correctWord = currentWord.word.toLowerCase();

  if (input === correctWord) {

    // 🔥 STREAK ARTIR
    streak++;

    let baseXP = 10;
    let bonusXP = baseXP + (streak * 2);

    feedback.innerText = `🎉 Doğru! +${bonusXP} XP 🔥 x${streak}`;
    wordEl.classList.add("correct");

    await fetch(`${API_URL}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        word_id: currentWord.id,
        is_correct: true,
        xp: bonusXP
      })
    });

    await loadUser();

    setTimeout(() => {
      wordEl.classList.remove("correct");
      nextWord();
    }, 600);

  } else {

    // ❌ STREAK SIFIRLA
    streak = 0;

    feedback.innerText = "❌ Yanlış! Streak sıfırlandı.";
    wordEl.classList.add("wrong");

    setTimeout(() => {
      wordEl.classList.remove("wrong");
    }, 400);
  }
}

/* =========================
   YENİ TUR
========================= */
async function restartGame() {
  const wordEl = document.getElementById("word");
  const restartBtn = document.getElementById("restartBtn");
  const feedback = document.getElementById("feedback");

  feedback.innerText = "";
  wordEl.innerText = "⏳ Yeni tur başlıyor...";
  restartBtn.style.display = "none";

  words = [];          // 🔥 ÖNEMLİ
  currentWord = null;  // 🔥 ÖNEMLİ
  streak = 0;          // combo reset

  await fetch(`${API_URL}/progress/reset?user_id=${USER_ID}`, {
    method: "POST"
  });

  await loadWords();
}

/* =========================
   TEMA SİSTEMİ
========================= */
function setTheme(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem("theme", theme);
}

const savedTheme = localStorage.getItem("theme");
document.body.className = savedTheme ? `theme-${savedTheme}` : "theme-light";

/* =========================
   EKRAN SİSTEMİ
========================= */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.remove("active")
  );
  document.getElementById(id).classList.add("active");
}

setTimeout(() => {
  showScreen("menu-screen");
}, 1800);

function startGame() {
  showScreen("game-screen");
  loadUser();
  loadWords();
}

function openSettings() {
  alert("Ayarlar yakında 👑");
}

/* =========================
   GLOBAL BAĞLANTILAR
========================= */
window.startGame = startGame;
window.openSettings = openSettings;
window.restartGame = restartGame;
window.setTheme = setTheme;

/* =========================
   İLK YÜKLEME
========================= */
loadUser();

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("submitBtn")
    .addEventListener("click", checkAnswer);

  document.getElementById("answerInput")
    .addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        checkAnswer();
      }
    });
});

function showLevelUpModal(level) {
  const modal = document.getElementById("levelModal");
  const message = document.getElementById("levelMessage");

  let unlockText = "";

  if (level >= 10) {
    unlockText = "🎤 Yeni mod açıldı: SESLİ KOMUT!";
  } else if (level >= 5) {
    unlockText = "🧩 Yeni mod açıldı: EŞLEŞTİRME!";
  } else {
    unlockText = "Harika gidiyorsun!";
  }

  if (level === 5) {
  setTimeout(() => {
    closeLevelModal();
    startMatching();
  }, 2000);
}

  message.innerText = `Level ${level} oldun!\n${unlockText}`;
  modal.style.display = "flex";
}

function closeLevelModal() {
  document.getElementById("levelModal").style.display = "none";
}

function startMatching() {
  showScreen("matching-screen");
  loadMatchingWords();
}

async function loadMatchingWords() {
  const res = await fetch(
    `${API_URL}/words/random?user_id=${USER_ID}&limit=3`
  );
  const data = await res.json();

  const left = document.getElementById("leftColumn");
  const right = document.getElementById("rightColumn");

  left.innerHTML = "";
  right.innerHTML = "";

  const shuffled = [...data].sort(() => Math.random() - 0.5);

  data.forEach(word => {
    const item = document.createElement("div");
    item.className = "card-item";
    item.innerText = word.word;
    item.draggable = true;
    item.dataset.id = word.id;

    item.addEventListener("dragstart", dragStart);
    left.appendChild(item);
  });

  shuffled.forEach(word => {
    const zone = document.createElement("div");
    zone.className = "drop-zone";
    zone.innerText = word.word; // şimdilik aynı kelime kullanıyoruz
    zone.dataset.id = word.id;

    zone.addEventListener("dragover", dragOver);
    zone.addEventListener("drop", dropItem);

    right.appendChild(zone);
  });
}

function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.dataset.id);
}

function dragOver(e) {
  e.preventDefault();
}

function dropItem(e) {
  e.preventDefault();

  const draggedId = e.dataTransfer.getData("text/plain");
  const targetId = e.target.dataset.id;

  const draggedElement = document.querySelector(
    `.card-item[data-id='${draggedId}']`
  );

  const targetElement = e.target;

  if (draggedId === targetId) {

    // ✅ Animasyon ekle
    draggedElement.classList.add("matched");
    targetElement.classList.add("matched");

    // 400ms sonra DOM’dan sil
    setTimeout(() => {
  draggedElement.remove();
  targetElement.remove();

  // ⭐ Eğer hiç kart kalmadıysa
  const remaining = document.querySelectorAll(".card-item");
  if (remaining.length === 0) {
    setTimeout(() => {
      alert("🎉 Eşleştirme turu tamamlandı!");
      showScreen("game-screen");
      loadWords();
    }, 300);
  }

}, 400);

  } else {

    // ❌ Yanlışsa küçük shake efekti verelim
    targetElement.classList.add("wrong");

    setTimeout(() => {
      targetElement.classList.remove("wrong");
    }, 300);
  }
}