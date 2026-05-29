from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser, DentistOnly
from app.core.security import hash_password
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.user import AdminResetPasswordRequest, PaginatedUsers, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedUsers)
async def list_users(
    _: DentistOnly,
    db: AsyncSession = Depends(get_db),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        query = query.where(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        data=[UserResponse.model_validate(u) for u in users],
        pagination={"page": page, "per_page": per_page, "total": total, "total_pages": -(-total // per_page)},
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, _: DentistOnly, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == str(body.email)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        email=str(body.email),
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/dentists", response_model=list[UserResponse])
async def list_dentists(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return active dentist accounts — available to all staff for appointment scheduling."""
    result = await db.execute(
        select(User).where(User.role == "dentist", User.is_active == True)
    )
    dentists = result.scalars().all()
    return [UserResponse.model_validate(d) for d in dentists]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, _: DentistOnly, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID, body: UserUpdate, current_user: DentistOnly, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.email is not None:
        user.email = str(body.email)
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        if not body.is_active and user.role == "dentist":
            dentist_count = await db.execute(
                select(func.count()).where(User.role == "dentist", User.is_active == True, User.id != user_id)
            )
            if dentist_count.scalar() == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last active dentist account.",
                )
        user.is_active = body.is_active

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", response_model=MessageResponse)
async def deactivate_user(user_id: UUID, current_user: DentistOnly, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == "dentist":
        dentist_count_result = await db.execute(
            select(func.count()).where(User.role == "dentist", User.is_active == True, User.id != user_id)
        )
        if dentist_count_result.scalar() == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active dentist account.",
            )

    user.is_active = False
    await db.flush()
    return MessageResponse(message="User deactivated successfully")


@router.post("/{user_id}/reset-password", response_model=MessageResponse)
async def admin_reset_password(
    user_id: UUID, body: AdminResetPasswordRequest, _: DentistOnly, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(body.new_password)
    await db.flush()
    return MessageResponse(message="Password reset by admin")
