from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    monthly_budget: Optional[float] = None

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    amount: float
    description: str
    category: str

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    user_id: int
    date: datetime

    class Config:
        from_attributes = True