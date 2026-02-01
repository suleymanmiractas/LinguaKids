from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    level = Column(Integer, default=1)
    total_score = Column(Integer, default=0)


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    language = Column(String)
    word = Column(String)
    image_url = Column(String)
    audio_url = Column(String)



class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    word_id = Column(Integer, ForeignKey("words.id"))
    is_correct = Column(Boolean)
