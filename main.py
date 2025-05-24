from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List
import models, schemas, database
from datetime import datetime, timedelta
from jose import jwt
import bcrypt
import uvicorn

# Create database tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Simple password hashing
def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(schemas.User).filter(schemas.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username
    }

@app.get("/users/me")
async def get_current_user(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    user_email = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
    user = db.query(schemas.User).filter(schemas.User.email == user_email).first()
    return {"username": user.username}

@app.post("/users/")
def create_user(user: models.UserCreate, db: Session = Depends(database.get_db)):
    existing_user = db.query(schemas.User).filter(
        (schemas.User.email == user.email) | (schemas.User.username == user.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email or username already registered"
        )
    
    db_user = schemas.User(
        email=user.email,
        username=user.username,
        hashed_password=get_password_hash(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"id": db_user.id, "email": db_user.email, "username": db_user.username}

@app.put("/users/budget")
async def update_budget(budget: float = Body(..., embed=True), db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    user_email = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
    user = db.query(schemas.User).filter(schemas.User.email == user_email).first()
    user.monthly_budget = budget
    db.commit()
    return {"message": "Budget updated successfully", "budget": budget}

@app.post("/expenses/")
async def create_expense(expense: models.ExpenseCreate, db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    try:
        user_email = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
        user = db.query(schemas.User).filter(schemas.User.email == user_email).first()
        
        db_expense = schemas.Expense(
            amount=expense.amount,
            description=expense.description,
            category=expense.category,
            date=datetime.now(),
            user_id=user.id
        )
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        
        return {
            "id": db_expense.id,
            "amount": db_expense.amount,
            "description": db_expense.description,
            "category": db_expense.category,
            "date": db_expense.date
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/expenses/")
async def get_expenses(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    user_email = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
    user = db.query(schemas.User).filter(schemas.User.email == user_email).first()
    expenses = db.query(schemas.Expense).filter(schemas.Expense.user_id == user.id).all()
    return expenses

@app.get("/expenses/summary")
async def get_expense_summary(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    user_email = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["sub"]
    user = db.query(schemas.User).filter(schemas.User.email == user_email).first()
    
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    monthly_expenses = db.query(schemas.Expense).filter(
        schemas.Expense.user_id == user.id,
        extract('month', schemas.Expense.date) == current_month,
        extract('year', schemas.Expense.date) == current_year
    ).all()
    
    total_spent = sum(expense.amount for expense in monthly_expenses)
    remaining_budget = user.monthly_budget - total_spent if user.monthly_budget else None
    
    return {
        "total_spent": total_spent,
        "monthly_budget": user.monthly_budget,
        "remaining_budget": remaining_budget,
        "is_over_budget": remaining_budget < 0 if remaining_budget is not None else None
    }

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def main():
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()