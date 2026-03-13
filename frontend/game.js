const API_URL = "http://127.0.0.1:8000";
const USER_ID = 1;

let words = [];
let currentWord = null;
let streak = 0;
let previousLevel = null;

let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let musicEnabled = localStorage.getItem("musicEnabled") !== "false";
let musicStarted = false;
let musicInterval = null;

let matchingTotal = 3;
let matchingCorrect = 0;

/* =========================
   KELİME ÇEVİRİ SÖZLÜĞÜ
========================= */
const TURKISH_DICT = {
  "apple": "Elma",
  "cat": "Kedi",
  "dog": "Köpek",
  "house": "Ev",
  "banana": "Muz",
  "orange": "Portakal",
  "grape": "Üzüm",
  "pineapple": "Ananas",
  "elephant": "Fil"
};

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

  const matchingLevelEl = document.getElementById("matchingLevel");
  const matchingScoreEl = document.getElementById("matchingScoreText");
  const matchingMainXpBar = document.getElementById("matchingMainXpBar");

  const voiceLevelEl = document.getElementById("voiceLevel");
  const voiceScoreEl = document.getElementById("voiceScoreText");
  const voiceMainXpBar = document.getElementById("voiceMainXpBar");

  if (levelEl) levelEl.innerText = user.level;
  if (scoreEl) scoreEl.innerText = user.total_score;

  if (matchingLevelEl) matchingLevelEl.innerText = user.level;
  if (matchingScoreEl) matchingScoreEl.innerText = user.total_score;

  if (voiceLevelEl) voiceLevelEl.innerText = user.level;
  if (voiceScoreEl) voiceScoreEl.innerText = user.total_score;

  // 🔥 LEVEL UP MODAL KONTROLÜ
  if (user.level > previousLevel) {

    // Level 131: Force Matching, Level 132: Force Voice. Above 133, let user choose.
    if (user.level === 131) {
      setTimeout(() => {
        startMatching();
      }, 800);
    } else if (user.level === 132) {
      setTimeout(() => {
        startVoiceMode();
      }, 800);
    }

    if (previousLevel === null) {
      previousLevel = user.level;
    }
  }

  // 🔓 MOD UNLOCK KONTROLÜ
  if (user.level >= 112) {
    const matchingBtn = document.getElementById("matchingBtn");
    if (matchingBtn) matchingBtn.style.display = "block";
  }

  if (user.level >= 113) {
    const voiceBtn = document.getElementById("voiceBtn");
    if (voiceBtn) voiceBtn.style.display = "block";
  }

  // XP BAR
  const xpInLevel = user.total_score % 30;
  const percent = (xpInLevel / 30) * 100;

  if (xpBar) xpBar.style.width = percent + "%";
  if (matchingMainXpBar) matchingMainXpBar.style.width = percent + "%";
  if (voiceMainXpBar) voiceMainXpBar.style.width = percent + "%";

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

  img.onerror = function () {
    img.onerror = null;
    img.src = API_URL + "/assets/default.jpg";
  };
}

/* =========================
   SES SİSTEMİ (Web Audio API)
   ========================= */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!soundEnabled) return;
  const now = audioCtx.currentTime;

  if (type === "correct") {
    // Gamey "Sparkle"
    [880, 1109, 1320].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      g.gain.setValueAtTime(0.1, now + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.2);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    });
  } else if (type === "wrong") {
    // Heavy "Thud"
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "square";
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    g.gain.setValueAtTime(0.1, now);
    g.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === "levelup") {
    // Victory Arpeggio
    const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    scale.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "triangle";
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      g.gain.setValueAtTime(0.1, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  }
}

/* =========================
   LO-FI HIP HOP MÜZİK MOTORU (Lazy Sunday Vibe)
   ========================= */
let musicTimeouts = [];

function startMusic() {
  if (musicStarted || !musicEnabled) return;
  musicStarted = true;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // 1. Vinyl Crackle (Constant Noise)
  const crackleNode = audioCtx.createGain();
  crackleNode.gain.setValueAtTime(0.005, audioCtx.currentTime);
  crackleNode.connect(audioCtx.destination);
  
  const bufferSize = 2 * audioCtx.sampleRate,
        buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
        output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = buffer;
  whiteNoise.loop = true;
  whiteNoise.connect(crackleNode);
  whiteNoise.start();
  musicTimeouts.push(whiteNoise);

  // 2. Music Loop (80 BPM)
  let step = 0;
  const chords = [
    [261.63, 329.63, 392.00, 493.88], // CMaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [293.66, 349.23, 440.00, 523.25], // Dm7
    [196.00, 246.94, 293.66, 349.23]  // G7
  ];

  musicInterval = setInterval(() => {
    if (!musicEnabled) return;
    const now = audioCtx.currentTime;
    
    // Beat: Kick on 1 & 3, Snare on 2 & 4
    if (step % 4 === 0) { // Kick
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.connect(g); g.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      g.gain.setValueAtTime(0.05, now);
      g.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(); osc.stop(now + 0.15);
    }
    if (step % 4 === 2) { // Snare
      const g = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass"; filter.frequency.value = 1000;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.03, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.start(); noise.stop(now + 0.1);
    }
    
    // Jazzy Chord on 1
    if (step % 8 === 0) {
      const chord = chords[(step / 8) % chords.length];
      chord.forEach(freq => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "triangle";
        osc.connect(g); g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.015, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
        osc.start(); osc.stop(now + 2.5);
      });
    }

    step++;
  }, 375); // 80 BPM (60000 / 80 / 2) - eighth notes
}

function stopMusic() {
  if (musicInterval) clearInterval(musicInterval);
  musicTimeouts.forEach(src => {
    try { src.stop(); } catch(e) {}
  });
  musicTimeouts = [];
  musicInterval = null;
  musicStarted = false;
}

// Browser requires interaction to start Audio
document.addEventListener("click", () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  startMusic();
}, { once: false });

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
    playSound("correct");

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
    playSound("wrong");

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
  
  // Highlight active button
  document.querySelectorAll(".theme-switcher button").forEach(btn => {
    const isThisTheme = btn.getAttribute("onclick").includes(`'${theme}'`);
    btn.classList.toggle("active", isThisTheme);
  });
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
  document.getElementById("settingsModal").style.display = "flex";
  document.getElementById("soundToggle").checked = soundEnabled;
  document.getElementById("musicToggle").checked = musicEnabled;
  
  // Set active theme button highlight
  const currentTheme = localStorage.getItem("theme") || "light";
  document.querySelectorAll(".theme-switcher button").forEach(btn => {
    const isThisTheme = btn.getAttribute("onclick").includes(`'${currentTheme}'`);
    btn.classList.toggle("active", isThisTheme);
  });
}

function closeSettings() {
  document.getElementById("settingsModal").style.display = "none";
}

function toggleSound() {
  soundEnabled = document.getElementById("soundToggle").checked;
  localStorage.setItem("soundEnabled", soundEnabled);
  if (soundEnabled) playSound("correct"); // Test sound
}

function toggleMusic() {
  musicEnabled = document.getElementById("musicToggle").checked;
  localStorage.setItem("musicEnabled", musicEnabled);
  if (musicEnabled) {
    if (!musicStarted) startMusic();
  } else {
    stopMusic();
  }
}

/* =========================
   GLOBAL BAĞLANTILAR
========================= */
window.startGame = startGame;
window.openSettings = openSettings;
window.restartGame = restartGame;
window.setTheme = setTheme;
window.startMatching = startMatching;
window.startVoiceMode = startVoiceMode;
window.startListening = startListening;
window.playWordAudio = playWordAudio;

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

  if (level === 113) {
    unlockText = "🎤 Yeni mod açıldı: SESLİ KOMUT!";
  } else if (level === 112) {
    unlockText = "🧩 Yeni mod açıldı: EŞLEŞTİRME!";
  } else {
    unlockText = "Harika gidiyorsun!";
  }

  if (level === 113) {
    setTimeout(() => {
      closeLevelModal();
      startVoiceMode();
    }, 2000);
  } else if (level === 112) {
    setTimeout(() => {
      closeLevelModal();
      startMatching();
    }, 2000);
  }

  message.innerText = `Level ${level} oldun!\n${unlockText}`;
  modal.style.display = "flex";
  playSound("levelup");
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
    `${API_URL}/words/random?user_id=${USER_ID}&limit=4`
  );
  const data = await res.json();

  const left = document.getElementById("leftColumn");
  const right = document.getElementById("rightColumn");

  left.innerHTML = "";
  right.innerHTML = "";

  // matching bar reset
  matchingTotal = data.length;
  matchingCorrect = 0;
  updateMatchingBar();

  const shuffled = [...data].sort(() => Math.random() - 0.5);

  data.forEach((word, index) => {
    const item = document.createElement("div");
    item.className = "card-item";
    item.innerText = word.word;
    item.draggable = true;
    item.dataset.id = word.id;
    item.style.animationDelay = `${index * 0.1}s`; // Staggered intro

    item.addEventListener("dragstart", dragStart);
    left.appendChild(item);
  });

  shuffled.forEach((word, index) => {
    const zone = document.createElement("div");
    zone.className = "drop-zone";

    // Turkish translation fallback
    const engWord = word.word.toLowerCase();
    const trWord = TURKISH_DICT[engWord] || word.word;

    zone.innerText = trWord;
    zone.dataset.id = word.id;
    zone.style.animationDelay = `${index * 0.1}s`; // Staggered intro

    zone.addEventListener("dragover", dragOver);
    zone.addEventListener("dragleave", dragLeave);
    zone.addEventListener("drop", dropItem);

    right.appendChild(zone);
  });
}

function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.dataset.id);
}

function dragLeave(e) {
  e.target.classList.remove("hover");
}

function updateMatchingBar() {
  const bar = document.getElementById("matchingXpBar");
  const scoreText = document.getElementById("matchingScore");

  if (!bar || !scoreText) return;

  const percent = matchingTotal > 0
    ? (matchingCorrect / matchingTotal) * 100
    : 0;

  bar.style.width = percent + "%";
  scoreText.innerText = matchingCorrect;
}
function dragOver(e) {
  e.preventDefault();
  e.target.classList.add("hover");
}

async function dropItem(e) {
  e.preventDefault();
  e.target.classList.remove("hover");

  const draggedId = e.dataTransfer.getData("text/plain");
  const targetId = e.target.dataset.id;

  const draggedElement = document.querySelector(
    `.card-item[data-id='${draggedId}']`
  );

  const targetElement = e.target;

  if (draggedId === targetId) {
    // ✅ Matching progress bar artsın
    matchingCorrect++;
    updateMatchingBar();
    playSound("correct");

    // ✅ Her doğru eşleşmeye XP ver
    const matchXP = 5;

    await fetch(`${API_URL}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        word_id: Number(draggedId),
        is_correct: true,
        xp: matchXP
      })
    });

    // ✅ Genel level / xp bar da güncellensin
    await loadUser();

    draggedElement.classList.add("matched");
    targetElement.classList.add("matched");

    setTimeout(() => {
      draggedElement.remove();
      targetElement.remove();

      const remaining = document.querySelectorAll(".card-item");
      if (remaining.length === 0) {
        setTimeout(() => {
          loadMatchingWords();
        }, 500);
      }
    }, 800); // Animasyon süresi kadar bekle

  } else {
    targetElement.classList.add("wrong");
    playSound("wrong");

    setTimeout(() => {
      targetElement.classList.remove("wrong");
    }, 300);
  }
}

/* =========================
   SESLİ KOMUT (VOICE) MODU (Cümle Pratiği)
========================= */
const VOICE_SENTENCES = [
  { id: 101, text: "I like apples" },
  { id: 102, text: "She has a cat" },
  { id: 103, text: "The dog is big" },
  { id: 104, text: "We go to school" },
  { id: 105, text: "It is a sunny day" },
  { id: 106, text: "He plays football" },
  { id: 107, text: "My house is blue" },
  { id: 108, text: "I drink water" },
  { id: 109, text: "They are my friends" },
  { id: 110, text: "Can you help me" }
];

let voiceSentenceData = null;

function startVoiceMode() {
  showScreen("voice-screen");
  loadVoiceSentence();
}

async function loadVoiceSentence() {
  const wordEl = document.getElementById("voiceWord");
  const feedbackEl = document.getElementById("voiceFeedback");
  const micStatus = document.getElementById("micStatus");
  const transcriptEl = document.getElementById("liveTranscript");
  const transcriptBox = document.getElementById("transcriptBox");

  feedbackEl.innerText = "";
  feedbackEl.className = "";
  micStatus.innerText = "Söylemek için tıklayın";

  if (transcriptEl && transcriptBox) {
    transcriptEl.innerText = "Sen konuşurken söylediklerin burada belirecek...";
    transcriptEl.className = "placeholder";
    transcriptBox.classList.remove("active");
  }

  const randomIndex = Math.floor(Math.random() * VOICE_SENTENCES.length);
  voiceSentenceData = VOICE_SENTENCES[randomIndex];

  wordEl.innerText = voiceSentenceData.text;
}

// Ses listesini önyükleme (Windows/Chrome bazen gecikmeli yükler)
let synthVoices = [];
window.speechSynthesis.onvoiceschanged = () => {
  synthVoices = window.speechSynthesis.getVoices();
};

function playWordAudio() {
  if (!voiceSentenceData) return;
  const utterance = new SpeechSynthesisUtterance(voiceSentenceData.text);
  utterance.lang = "en-US";

  if (synthVoices.length === 0) {
    synthVoices = window.speechSynthesis.getVoices();
  }

  // En iyi İngilizce sesi bulmaya çalış (Windows'ta Zira/David, Mac'te Samantha vb.)
  let bestVoice = synthVoices.find(v => v.lang === "en-US" && (v.name.includes("Google") || v.name.includes("Zira") || v.name.includes("Samantha")));

  if (!bestVoice) {
    bestVoice = synthVoices.find(v => v.lang.startsWith("en-"));
  }

  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  utterance.rate = 0.85; // Çocuklar için daha yavaş ve net
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
}

function cleanPunctuation(str) {
  return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
}

function startListening() {
  if (!voiceSentenceData) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome vb. bir tarayıcı kullanın.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  // Localhost ve HTTP üzerinde continuous=true genellikle sessizce çöker veya bloke olur.
  // Bu yüzden sadece interimResults istiyoruz.
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  const micBtn = document.getElementById("micBtn");
  const micStatus = document.getElementById("micStatus");
  const feedbackEl = document.getElementById("voiceFeedback");
  const transcriptEl = document.getElementById("liveTranscript");
  const transcriptBox = document.getElementById("transcriptBox");

  let finalTranscript = "";
  let lastInterimTranscript = "";

  recognition.onstart = function () {
    micBtn.classList.add("listening");
    micBtn.classList.add("active-click");
    setTimeout(() => micBtn.classList.remove("active-click"), 200);

    micStatus.innerText = "Dinleniyor, lütfen tek seferde konuşun...";
    feedbackEl.innerText = "";

    transcriptEl.innerText = "...";
    transcriptEl.className = "";
    transcriptBox.classList.add("active");
  };

  recognition.onresult = function (event) {
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    // Interim transcript'i yedek olarak sakla
    if (interimTranscript.trim() !== "") {
      lastInterimTranscript = interimTranscript;
    }

    const displayTranscript = finalTranscript || interimTranscript;
    if (displayTranscript && displayTranscript.trim() !== "") {
      transcriptEl.innerText = displayTranscript;
    }
  };

  recognition.onend = async function () {
    micBtn.classList.remove("listening");
    micStatus.innerText = "Söylemek için tıklayın";

    // finalTranscript yoksa interim'i kullan (bazı tarayıcılarda isFinal gelmez)
    if (!finalTranscript && lastInterimTranscript) {
      finalTranscript = lastInterimTranscript;
    }

    // Once recognition ends, analyze the final transcript
    if (!finalTranscript || finalTranscript.trim() === "") {
      transcriptBox.classList.remove("active");
      return; // Kullanıcı hiç konuşmadı
    }

    const userSpokenText = cleanPunctuation(finalTranscript);
    const targetText = cleanPunctuation(voiceSentenceData.text);

    if (userSpokenText === targetText) {
      feedbackEl.innerText = "🎉 Mükemmel! Çok iyi okudun!";
      feedbackEl.className = "correct";
      playSound("correct");

      await fetch(`${API_URL}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          word_id: voiceSentenceData.id,
          is_correct: true,
          xp: 15 // More XP for sentences
        })
      });

      await loadUser();

      setTimeout(() => {
        loadVoiceSentence();
      }, 2500);

    } else {
      feedbackEl.innerText = `❌ Olmadı, tekrar deneyelim.`;
      feedbackEl.className = "wrong";
      playSound("wrong");
    }
  };

  recognition.onerror = function (event) {
    if (event.error === 'not-allowed') {
      micStatus.innerText = "❌ Mikrofon izni reddedildi.";
    } else if (event.error === 'no-speech') {
      micStatus.innerText = "Ses algılanmadı.";
    } else {
      micStatus.innerText = "Söylediğin anlaşılamadı, tekrar dene.";
    }
    micBtn.classList.remove("listening");
    transcriptBox.classList.remove("active");
  };

  recognition.start();
}