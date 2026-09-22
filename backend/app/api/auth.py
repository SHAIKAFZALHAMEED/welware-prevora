"""Demo auth — role-based accounts for judges, teammates, and team demo."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ── Demo accounts ─────────────────────────────────────────────────────────────
# Passwords are intentionally simple demo-only credentials.
# This is a prototype — no real data, no real users.
DEMO_USERS = {
    "hse@prevora.demo": {
        "password": "prevora2026",
        "name": "SHAIK AFZAL HAMEED",
        "role": "HSE Officer",
        "role_code": "hse",
        "access": "Priority Queue · SIF Intelligence · Barrier Health · Defence Monitor",
        "primary_demo": True,
    },
    "worker@prevora.demo": {
        "password": "field2026",
        "name": "SHAIK AFZAL HAMEED",
        "role": "Field Worker",
        "role_code": "worker",
        "access": "Adaptive Safety Interview · Report Submission",
        "primary_demo": False,
    },
    "manager@prevora.demo": {
        "password": "manager2026",
        "name": "SHAIK AFZAL HAMEED",
        "role": "HSE Manager",
        "role_code": "manager",
        "access": "Cross-site Intelligence · Barrier Trends · Convergence · Pan-India Map",
        "primary_demo": False,
    },
    "admin@prevora.demo": {
        "password": "admin2026",
        "name": "SHAIK AFZAL HAMEED",
        "role": "System Admin",
        "role_code": "admin",
        "access": "Full system access · Validation · Configuration",
        "primary_demo": False,
    },
    # Legacy accounts — kept for backward compat with existing sessions
    "hse@oil.in":   {"password": "prevora2026", "name": "SHAIK AFZAL HAMEED", "role": "HSE Officer",  "role_code": "hse",   "access": "", "primary_demo": False},
    "admin@oil.in": {"password": "admin2026",   "name": "SHAIK AFZAL HAMEED", "role": "System Admin", "role_code": "admin", "access": "", "primary_demo": False},
}


class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    token: str
    name: str
    role: str
    email: str


@router.post("/login", response_model=LoginOut)
async def login(body: LoginIn):
    user = DEMO_USERS.get(body.email)
    if not user or user["password"] != body.password:
        from fastapi import HTTPException
        raise HTTPException(401, "Invalid credentials")
    import base64, json
    token = base64.b64encode(
        json.dumps({"email": body.email, "role": user["role_code"]}).encode()
    ).decode()
    return LoginOut(token=token, name=user["name"], role=user["role"], email=body.email)


@router.get("/demo-accounts")
async def demo_accounts():
    """Return sanitized list of demo accounts for the login hint panel.
    Never returns passwords — only email, name, role, and access description.
    """
    return [
        {
            "email": email,
            "name": u["name"],
            "role": u["role"],
            "access": u["access"],
            "primary_demo": u["primary_demo"],
        }
        for email, u in DEMO_USERS.items()
        if u.get("access")  # skip legacy accounts with no display access string
    ]


@router.get("/me")
async def me(token: str = ""):
    """Decode the demo token to return current user info."""
    if not token:
        return {"email": "guest", "role": "guest"}
    try:
        import base64, json
        data = json.loads(base64.b64decode(token).decode())
        email = data.get("email", "")
        user = DEMO_USERS.get(email, {})
        return {"email": email, "name": user.get("name", ""), "role": data.get("role", "guest")}
    except Exception:
        return {"email": "guest", "role": "guest"}
