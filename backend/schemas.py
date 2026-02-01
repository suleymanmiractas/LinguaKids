from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    name: str


class UserResponse(BaseModel):
    id: int
    name: str
    level: int
    total_score: int

    class Config:
        from_attributes = True


class WordCreate(BaseModel):
    word: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class WordResponse(BaseModel):
    id: int
    word: str
    image_url: Optional[str]
    audio_url: Optional[str]

    class Config:
        from_attributes = True

class ProgressCreate(BaseModel):
    user_id: int
    word_id: int
    is_correct: bool


class ProgressResponse(BaseModel):
    id: int
    user_id: int
    word_id: int
    is_correct: bool

    class Config:
        from_attributes = True
