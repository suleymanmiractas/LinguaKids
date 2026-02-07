const API_URL = "http://127.0.0.1:8000";
const USER_ID = 1;

let words = [];
let currentWord = null;

// kullanıcı bilgisini çek
async function loadUser() {
  const res = await fetch(`${API_URL}/users`);
  const data = await res.json();

  const user = data.find(u => u.id === USER_ID);
  if (!user) return;

  document.getElementById("level").innerText = user.level;
  document.getElementById("score").innerText = user.total_score;
}

// kelimeleri çek
async function loadWords() {
  const res = await fetch(
    `${API_URL}/words/random?user_id=${USER_ID}&limit=5`
  );
  words = await res.json();
  nextWord();
}

// sıradaki kelime
function nextWord() {
  const wordEl = document.getElementById("word");
  const restartBtn = document.getElementById("restartBtn");

  if (words.length === 0) {
    wordEl.innerText = "🎉 Tebrikler!\nBu turu bitirdin!";
    restartBtn.style.display = "block";
    currentWord = null;
    return;
  }

  restartBtn.style.display = "none";
  currentWord = words.pop();
  wordEl.innerText = currentWord.word;
}

// cevap gönder
async function answer(isCorrect) {
  if (!currentWord) return;

  const wordEl = document.getElementById("word");
  wordEl.className = isCorrect ? "correct" : "wrong";

  await fetch(`${API_URL}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      word_id: currentWord.id,
      is_correct: isCorrect
    })
  });

  await loadUser();

  setTimeout(() => {
    wordEl.className = "";
    nextWord();
  }, 400);
}

// yeni tur
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

// ilk yükleme
loadUser();
loadWords();


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

window.setTheme = setTheme;
window.answer = answer;
window.restartGame = restartGame;
