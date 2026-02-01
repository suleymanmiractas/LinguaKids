from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models
from models import User
from schemas import UserCreate, UserResponse
from models import User, Word, Progress
from schemas import UserCreate, UserResponse, WordCreate, WordResponse, ProgressCreate, ProgressResponse


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LinguaKids API")


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
    new_progress = Progress(
        user_id=progress.user_id,
        word_id=progress.word_id,
        is_correct=progress.is_correct
    )
    db.add(new_progress)

    if progress.is_correct:
        user = db.query(User).filter(User.id == progress.user_id).first()
        if user:
            user.total_score += 10

    db.commit()
    db.refresh(new_progress)
    return new_progress
