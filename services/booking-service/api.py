import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from shared.database import get_db
from shared.security import get_current_user_id
from .schemas import BookingCreateRequest, BookingResponse
from .service import create_booking, mongo_id

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/bookings", response_model=BookingResponse)
async def create_booking_api(
    payload: BookingCreateRequest, 
    db: AsyncIOMotorDatabase = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    return await create_booking(payload, user_id, db)


@router.get("/bookings", response_model=List[BookingResponse])
async def get_user_bookings(
    db: AsyncIOMotorDatabase = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    bookings = []
    async for item in db["bookings"].find({"user_id": user_id}).sort("created_at", -1):
        item["id"] = str(item.pop("_id"))
        bookings.append(item)
    return bookings


@router.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    booking = await db["bookings"].find_one({"id": booking_id, "user_id": user_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return mongo_id(booking)
