const API_URL = "http://127.0.0.1:8000";
const USER_ID = 1;

let words = [];
let currentWord = null;

/* =========================
   KULLANICI YÜKLE
========================= */
async function loadUser() {
  const res = await fetch(`${API_URL}/users`);
  const data = await res.json();

  const user = data.find(u => u.id === USER_ID);
  if (!user) return;

  document.getElementById("level").innerText = user.level;
  document.getElementById("score").innerText = user.total_score;
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
    feedback.innerText = "🎉 Doğru! +10";
    wordEl.classList.add("correct");

    await fetch(`${API_URL}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        word_id: currentWord.id,
        is_correct: true
      })
    });

    await loadUser();

    setTimeout(() => {
      wordEl.classList.remove("correct");
      nextWord();
    }, 600);

  } else {
    feedback.innerText = "❌ Yanlış, tekrar dene!";
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

  wordEl.innerText = "⏳ Yeni tur başlıyor...";
  restartBtn.style.display = "none";

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
if (savedTheme) {
  document.body.className = `theme-${savedTheme}`;
} else {
  document.body.className = "theme-light";
}

/* =========================
   EKRAN SİSTEMİ
========================= */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.remove("active")
  );
  document.getElementById(id).classList.add("active");
}

// Açılış → Menü
setTimeout(() => {
  showScreen("menu-screen");
}, 1800);

// Menü → Oyun
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
window.checkAnswer = checkAnswer;

/* =========================
   İLK YÜKLEME
========================= */
loadUser();
