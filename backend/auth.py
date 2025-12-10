"""
Simple authentication system for Face2Phrase
Local storage with secure password hashing
"""

import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path

from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status
from pydantic import BaseModel

# Configuration
SECRET_KEY = "face2phrase-demo-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Local user storage file
USERS_FILE = Path("users.json")

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    full_name: str
    email: str
    created_at: str
    is_active: bool = True

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def load_users() -> Dict[str, Any]:
    """Load users from local JSON file"""
    if not USERS_FILE.exists():
        return {}
    
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def save_users(users: Dict[str, Any]) -> None:
    """Save users to local JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def get_user(username: str) -> Optional[Dict[str, Any]]:
    """Get user by username"""
    users = load_users()
    return users.get(username)

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user with username and password"""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return username"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None

def create_user(user_data: UserCreate) -> Dict[str, Any]:
    """Create a new user"""
    users = load_users()
    
    # Check if user already exists
    if user_data.username in users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = {
        "username": user_data.username,
        "full_name": user_data.full_name,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow().isoformat(),
        "is_active": True
    }
    
    users[user_data.username] = user
    save_users(users)
    
    # Return user without password
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "email": user["email"],
        "created_at": user["created_at"],
        "is_active": user["is_active"]
    }

def get_current_user_from_token(token: str) -> Dict[str, Any]:
    """Get current user from JWT token"""
    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user(username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "username": user["username"],
        "full_name": user["full_name"],
        "email": user["email"],
        "created_at": user["created_at"],
        "is_active": user["is_active"]
    }

# Initialize with demo user if no users exist
def initialize_demo_user():
    """Create a demo user for presentation purposes"""
    users = load_users()
    if not users:
        demo_user = UserCreate(
            username="demo",
            password="demo123",
            full_name="Demo User",
            email="demo@face2phrase.com"
        )
        try:
            create_user(demo_user)
            print("✅ Demo user created: username='demo', password='demo123'")
        except HTTPException:
            pass  # User already exists

# Initialize demo user on import
initialize_demo_user()