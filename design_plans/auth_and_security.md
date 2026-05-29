# Design Plan: Authentication & Security

**Document Version:** 1.0
**Feature:** Auth & Security (MVP)
**Audience:** Engineering team, tech lead

---

## 1. Objective

Implement a stateless, token-based authentication system that gates every API endpoint and enforces role-based access control (RBAC) for the two staff roles: `dentist` and `receptionist`. The system must provide secure login/logout, password management, and session continuity through silent token refresh — all without requiring a dedicated auth microservice, keeping the architecture appropriate for a solo-developer project.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI (Python 3.11+) | Auth endpoints, JWT middleware, RBAC dependency injection |
| **JWT Library** | `python-jose[cryptography]` | JWT creation, signing (HS256), and validation |
| **Password Hashing** | `passlib[bcrypt]` | Bcrypt hashing for password storage; never stored in plaintext |
| **Database** | Supabase PostgreSQL (via `asyncpg` / SQLAlchemy async) | `users` table — credentials and role storage |
| **Token Storage** | HTTP-only cookies or `Authorization` header (Bearer) | Access token transport |
| **Email Delivery** | SendGrid API | Password reset emails |
| **Environment Config** | `pydantic-settings` (`BaseSettings`) | `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` |
| **Frontend** | Next.js 14 (App Router) | Login page, token storage in memory + refresh cookie, auth context |
| **Frontend Auth State** | React Context + `useReducer` | Global auth state; token renewal without page reload |
| **HTTP Client** | `axios` with interceptors | Automatic Authorization header injection; 401 interception for refresh |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS FRONTEND                         │
│                                                                 │
│  LoginPage ──► AuthContext (token + user role in memory)        │
│                    │                                            │
│  ProtectedLayout ──┤ checks role ──► redirect if unauthorized   │
│                    │                                            │
│  Axios Instance ───┤ injects Bearer token on every request      │
│                    └─► on 401: calls /auth/refresh silently     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND                          │
│                                                                 │
│  /auth/login ──────────────────► validate credentials           │
│  /auth/refresh ────────────────► validate refresh token         │
│  /auth/forgot-password ────────► send reset email (SendGrid)    │
│  /auth/reset-password ─────────► validate token, update hash    │
│  /auth/me (GET/PUT) ───────────► return / update profile        │
│  /auth/change-password ────────► verify old password, update    │
│                                                                 │
│  JWTBearer (FastAPI Dependency) ──► validates access token      │
│  RoleChecker (FastAPI Dependency) ► enforces dentist/reception  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ asyncpg
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE POSTGRESQL                          │
│                                                                 │
│   users table: id, email, password_hash, role, is_active        │
│   password_reset_tokens table: token_hash, user_id, expires_at  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### Table: `users`

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('dentist', 'receptionist')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
```

### Table: `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,          -- SHA-256 hash of the raw token sent by email
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,            -- NULL means unused
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_prt_user_id    ON password_reset_tokens(user_id);
```

> **Note:** The raw reset token is never stored. Only its SHA-256 hash is persisted. This means even a database breach cannot be used to reset passwords.

### Pydantic Schemas (Backend)

```python
class TokenPayload(BaseModel):
    sub: str          # user_id (UUID as string)
    role: str         # "dentist" | "receptionist"
    type: str         # "access" | "refresh"
    exp: int          # Unix timestamp

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int   # seconds
    user: UserPublic

class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
```

---

## 5. Core Design Decisions

### 5.1 JWT Over Session Cookies

**Decision:** Use stateless JWTs rather than server-side sessions.

**Rationale:** The FastAPI backend is deployed on Railway/Render as a stateless container. Sessions would require a shared Redis or DB-backed session store, adding infrastructure complexity. JWTs embed the user's identity and role directly in the token payload, eliminating a DB lookup on every request.

**Trade-off:** JWTs cannot be truly "invalidated" server-side before expiry. Mitigated by keeping access tokens short-lived (15 minutes) and managing refresh tokens in the DB with the ability to revoke.

### 5.2 Access Token in Memory, Refresh Token in HTTP-only Cookie

**Decision:** The access token is stored in JavaScript memory (React state) and not in `localStorage` or `sessionStorage`. The refresh token is stored in an HTTP-only cookie.

**Rationale:** Prevents XSS attacks from stealing tokens. An HTTP-only cookie cannot be accessed by JavaScript, so a compromised script on the page cannot exfiltrate the refresh token. The access token lives only in memory and is lost on tab close, forcing a silent refresh via the cookie.

### 5.3 Generic Login Error Message

**Decision:** Both "user not found" and "wrong password" return the identical HTTP 401 response: `"Invalid email or password"`.

**Rationale:** Distinguishing between the two allows an attacker to enumerate valid email addresses. This is a standard security hardening measure.

### 5.4 RBAC via FastAPI Dependencies

**Decision:** Role enforcement is implemented as composable FastAPI dependency functions (`Depends()`), not as inline if/else checks in each route.

**Rationale:** Centralised, DRY, and easy to audit. Adding a new role or changing a permission requires editing the dependency, not every affected route.

```python
# Usage example
@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: UUID,
    current_user: User = Depends(require_role("dentist"))
):
    ...
```

### 5.5 Password Reset Token Security

**Decision:** The raw reset token (a cryptographically random 32-byte string, URL-safe base64 encoded) is sent in the email. Only its SHA-256 hash is stored in the database.

**Rationale:** If the `password_reset_tokens` table is leaked, an attacker cannot use the stored hashes to reset passwords — they would need the raw token from the email.

### 5.6 Bcrypt Work Factor

**Decision:** Bcrypt with a cost factor of 12.

**Rationale:** Factor 12 produces ~300ms hash time on a modern server, which is acceptable for login latency but expensive enough to make brute-force attacks impractical.

---

## 6. Core Functional Flows

### 6.1 Login Flow

```
Client                              FastAPI                          PostgreSQL
  │                                     │                                │
  ├─ POST /auth/login ─────────────────►│                                │
  │  {email, password}                  ├─ SELECT * FROM users          │
  │                                     │   WHERE email = ? ────────────►│
  │                                     │◄──────────────── user row ─────┤
  │                                     │                                │
  │                                     ├─ bcrypt.verify(password,       │
  │                                     │   password_hash)               │
  │                                     │                                │
  │                                     ├─ if invalid ──► 401 Unauthorized
  │                                     │                                │
  │                                     ├─ create_access_token(sub=id,   │
  │                                     │   role=role, exp=now+15min)    │
  │                                     ├─ create_refresh_token(sub=id,  │
  │                                     │   role=role, exp=now+7d)       │
  │                                     │                                │
  │◄─ 200 {access_token, user} ─────────┤                                │
  │   Set-Cookie: refresh_token; HttpOnly; Secure; SameSite=Strict       │
```

### 6.2 Silent Token Refresh Flow

```
Axios Interceptor (Frontend)        FastAPI
  │                                     │
  ├─ API request with expired token ───►│
  │◄─ 401 Token has expired ────────────┤
  │                                     │
  ├─ POST /auth/refresh ───────────────►│
  │  (refresh token sent via cookie)    ├─ decode & validate refresh JWT
  │                                     ├─ verify token type = "refresh"
  │                                     ├─ verify user still active
  │◄─ 200 {access_token} ───────────────┤
  │                                     │
  ├─ update token in React state        │
  ├─ retry original request ───────────►│
  │◄─ 200 original response ────────────┤
```

### 6.3 RBAC Enforcement Flow

```python
# FastAPI dependency chain

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_jwt(token)           # raises 401 if invalid/expired
    user = await db.get_user(payload.sub) # raises 401 if user not found
    if not user.is_active:
        raise HTTPException(403, "Account is inactive")
    return user

def require_role(*roles: str):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You do not have permission")
        return user
    return checker

# Route usage:
@router.post("/clinical-notes")
async def create_note(
    body: NoteCreate,
    user: User = Depends(require_role("dentist"))  # only dentist can create
):
```

### 6.4 Password Reset Flow

```
Client                     FastAPI                   SendGrid          DB
  │                            │                         │              │
  ├─ POST /forgot-password ───►│                         │              │
  │  {email}                   ├─ lookup user by email ─────────────────►│
  │                            │◄─────────────────────────────────────── │
  │                            ├─ generate 32-byte random token          │
  │                            ├─ hash = SHA256(token)                   │
  │                            ├─ INSERT reset_tokens(hash, exp) ────────►│
  │                            ├─ send email (token in URL) ────────────►│
  │◄─ 200 (generic message) ───┤                         │              │
  │                            │                         │              │
  ├─ POST /reset-password ────►│                         │              │
  │  {token, new_password}     ├─ hash = SHA256(token)                  │
  │                            ├─ SELECT WHERE hash=? AND exp>NOW() ────►│
  │                            │◄─────────────────────────── token row ─ │
  │                            ├─ bcrypt(new_password)                   │
  │                            ├─ UPDATE users SET password_hash = ?  ──►│
  │                            ├─ UPDATE reset_tokens SET used_at = NOW()►│
  │◄─ 200 {message} ───────────┤                         │              │
```

---

## 7. Development Plan

### Sprint 1 — Week 1: Backend Foundation

| Task | Detail | Est. |
|---|---|---|
| Set up FastAPI project structure | `app/core/`, `app/api/v1/auth.py`, `app/models/`, `app/schemas/` | 0.5d |
| Configure `pydantic-settings` | Load `SECRET_KEY`, DB URL, token expiry, SendGrid key from `.env` | 0.5d |
| Create `users` and `password_reset_tokens` tables | Alembic migration, indexes | 0.5d |
| Implement password hashing utilities | `passlib` bcrypt wrapper; `verify_password`, `hash_password` helpers | 0.5d |
| Implement JWT utilities | `create_access_token`, `create_refresh_token`, `decode_token` using `python-jose` | 1d |
| Implement `POST /auth/login` | Credential verification, token issuance, HttpOnly cookie | 1d |
| Implement `POST /auth/refresh` | Validate refresh token from cookie, issue new access token | 0.5d |
| Implement `GET /auth/me` and `PUT /auth/me` | Profile retrieval and update | 0.5d |
| Implement RBAC dependencies | `get_current_user`, `require_role()` | 0.5d |

### Sprint 1 — Week 2: Password Management & User Admin

| Task | Detail | Est. |
|---|---|---|
| Implement `PUT /auth/change-password` | Verify current password, update hash | 0.5d |
| Implement `POST /auth/forgot-password` | Generate token, hash it, store, call SendGrid | 1d |
| Implement `POST /auth/reset-password` | Validate hashed token, update password, mark token used | 1d |
| Implement `/users` CRUD (dentist-only) | List, create, get, update, deactivate, admin reset-password | 1.5d |
| Write unit tests | Login, token refresh, RBAC denial, password reset flow | 1d |

### Sprint 2: Frontend

| Task | Detail | Est. |
|---|---|---|
| Build `AuthContext` + `useReducer` | Token state, login/logout actions, user role | 1d |
| Build Login page (`/login`) | Form, error handling, redirect on success | 1d |
| Configure Axios instance | Base URL, request interceptor (inject token), response interceptor (silent refresh on 401) | 1d |
| Implement `ProtectedLayout` | Server-side redirect if no valid session; role-based route guard | 1d |
| Build User Management page | List users, create user, deactivate — dentist-only route | 1.5d |
| Build Profile & Change Password page | Shared for both roles | 0.5d |
| Integration test: full auth flow | Login → API call → token expiry → silent refresh → logout | 0.5d |

### Definition of Done

- [ ] All auth endpoints return correct status codes for valid and invalid inputs.
- [ ] RBAC dependency correctly denies receptionist access to dentist-only routes (verified by automated test).
- [ ] Silent token refresh completes without user-visible interruption.
- [ ] Password reset tokens cannot be reused; expired tokens are rejected.
- [ ] Access token is not present in `localStorage` or `sessionStorage` (verified by browser dev tools inspection).
- [ ] Last active dentist account cannot be deactivated (backend guard in place).
