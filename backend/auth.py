import os
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security

API_KEY = os.getenv("API_KEY", "bruning-dashboard-2026")

_bearer = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(_bearer)):
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
