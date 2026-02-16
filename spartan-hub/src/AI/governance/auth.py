from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional, List
import os
from enum import Enum
from pydantic import BaseModel

class Role(str, Enum):
    USER = "user"
    REVIEWER = "reviewer"
    ADMIN = "admin"

class User(BaseModel):
    user_id: str
    role: Role

class JWTAuthenticator:
    def __init__(self):
        self.jwt_secret = os.getenv("JWT_SECRET")
        self.jwt_algo = os.getenv("JWT_ALGO", "HS256")
        self.security = HTTPBearer()
        
        if not self.jwt_secret:
            raise ValueError("JWT_SECRET environment variable is required")

    async def get_current_user(
        self,
        auth: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    ) -> User:
        try:
            payload = jwt.decode(
                auth.credentials,
                self.jwt_secret,
                algorithms=[self.jwt_algo]
            )
            
            return User(
                user_id=payload["userId"],
                role=Role(payload["role"])
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

    def require_roles(self, allowed_roles: List[Role]):
        async def role_checker(user: User = Depends(self.get_current_user)):
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return user
        return role_checker

# Create singleton instance
auth = JWTAuthenticator()