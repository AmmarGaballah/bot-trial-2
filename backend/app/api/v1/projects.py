"""
Project management endpoints.
"""

from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.db.models import Project
from app.models.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Create a new project/brand.
    
    Projects allow multi-tenant support where each user can manage multiple brands.
    """
    new_project = Project(
        owner_id=UUID(user_id),
        name=project_data.name,
        description=project_data.description,
        timezone=project_data.timezone,
        settings=project_data.settings
    )
    
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    logger.info("Project created", project_id=str(new_project.id), user_id=user_id)
    
    return new_project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    List all projects owned by the current user.
    """
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == UUID(user_id))
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get a specific project by ID.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.owner_id == UUID(user_id))
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Update a project's information.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.owner_id == UUID(user_id))
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    update_data = project_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    logger.info("Project updated", project_id=str(project_id), user_id=user_id)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a project.
    
    WARNING: This will cascade delete all associated data:
    - Integrations
    - Orders
    - Messages
    - Reports
    - Training data
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.owner_id == UUID(user_id))
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    await db.delete(project)
    await db.commit()
    
    logger.info("Project deleted", project_id=str(project_id), user_id=user_id)
    
    return None
