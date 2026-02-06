from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models
from models import User
from schemas import UserCreate, UserResponse
from models import User, Word, Progress
from schemas import UserCreate, UserResponse, WordCreate, WordResponse, ProgressCreate, ProgressResponse
import random
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_
import random



models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LinguaKids API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "LinguaKids backend çalışıyor 🎉"}


@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(
        name=user.name,
        level=1,
        total_score=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@app.post("/words", response_model=WordResponse)
def create_word(word: WordCreate, db: Session = Depends(get_db)):
    new_word = Word(
        word=word.word,
        level=word.level,
        image_url=word.image_url,
        audio_url=word.audio_url
    )
    db.add(new_word)
    db.commit()
    db.refresh(new_word)
    return new_word

@app.get("/words", response_model=list[WordResponse])
def get_words(db: Session = Depends(get_db)):
    return db.query(Word).all()

@app.post("/progress", response_model=ProgressResponse)
def create_progress(progress: ProgressCreate, db: Session = Depends(get_db)):
    # kullanıcıyı başta çek
    user = db.query(User).filter(User.id == progress.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_progress = Progress(
        user_id=progress.user_id,
        word_id=progress.word_id,
        is_correct=progress.is_correct
    )
    db.add(new_progress)

    if progress.is_correct:
        user.total_score += 10
        user.level = (user.total_score // 30) + 1

    db.commit()
    db.refresh(new_progress)
    return new_progress


@app.get("/words/by-level/{level}", response_model=list[WordResponse])
def get_words_by_level(level: int, db: Session = Depends(get_db)):
    return db.query(Word).filter(Word.level <= level).all()




import random

@app.get("/words/random", response_model=list[WordResponse])
def get_random_words(user_id: int, limit: int = 5, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # kullanıcının çözdüğü kelimeler
    solved_word_ids = (
        db.query(Progress.word_id)
        .filter(Progress.user_id == user_id)
        .distinct()
        .all()
    )
    solved_word_ids = [w[0] for w in solved_word_ids]

    # çözülmemiş + level'a uygun kelimeler
    words = (
        db.query(Word)
        .filter(
            Word.level <= user.level,
            ~Word.id.in_(solved_word_ids)
        )
        .all()
    )

    if not words:
        return []

    random.shuffle(words)
    return words[:limit]




@app.post("/progress/reset")
def reset_progress(user_id: int, db: Session = Depends(get_db)):
    # kullanıcının tüm progress kayıtlarını sil
    db.query(Progress).filter(Progress.user_id == user_id).delete()
    db.commit()

    return {"message": "Progress resetlendi"}


import json
from pathlib import Path

@app.post("/words/bulk-load")
def bulk_load_words(db: Session = Depends(get_db)):
    file_path = Path("words_data.json")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="words_data.json bulunamadı")

    with open(file_path, "r", encoding="utf-8") as f:
        words = json.load(f)

    added = 0
    for item in words:
        exists = db.query(Word).filter(Word.word == item["word"]).first()
        if exists:
            continue

        word = Word(
            word=item["word"],
            level=item["level"],
            image_url=None,
            audio_url=None
        )
        db.add(word)
        added += 1

    db.commit()
    return {"added_words": added}
