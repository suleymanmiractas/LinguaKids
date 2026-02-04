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
    return;
  }

  restartBtn.style.display = "none";
  currentWord = words.pop();
  wordEl.innerText = currentWord.word;
  
}

// cevap gönder + animasyon
async function answer(isCorrect) {
  if (!currentWord) return;

  const wordEl = document.getElementById("word");

  // animasyon class ekle
  wordEl.className = isCorrect ? "correct" : "wrong";

  // backend'e cevabı gönder
  await fetch(`${API_URL}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      word_id: currentWord.id,
      is_correct: isCorrect
    })
  });

  // kullanıcı bilgilerini güncelle
  await loadUser();

  // animasyon süresi kadar bekle
  setTimeout(() => {
    wordEl.className = ""; // class temizle
    nextWord();            // sıradaki kelime
  }, 500);
}

// ilk yükleme
loadUser();
loadWords();

async function restartGame() {
  const wordEl = document.getElementById("word");
  const restartBtn = document.getElementById("restartBtn");

  wordEl.innerText = "⏳ Yeni tur başlıyor...";
  restartBtn.style.display = "none";

  // backend'te progress'i sıfırla
  await fetch(`${API_URL}/progress/reset?user_id=${USER_ID}`, {
    method: "POST"
  });

  // kelimeleri yeniden çek
  await loadWords();
}

