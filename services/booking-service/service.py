import logging
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def calculate_price(distance_km: float, weight_kg: float, transport_type: str) -> float:
    # Realistic India local transport pricing (in ₹)
    base_rates = {"bike": 30, "van": 80, "truck": 300}
    per_km_rates = {"bike": 8, "van": 15, "truck": 30}
    
    base = base_rates.get(transport_type, 80)
    per_km = per_km_rates.get(transport_type, 15)
    
    # Calculate: base + (distance * per km) + small weight charge
    price = base + (distance_km * per_km) + (weight_kg * 1)
    
    # Cap maximum price for local deliveries
    if transport_type == "bike":
        price = min(price, 200)  # Max ₹200 for bike
    elif transport_type == "van":
        price = min(price, 500)  # Max ₹500 for van
    elif transport_type == "truck":
        price = min(price, 1500)  # Max ₹1500 for truck
    
    return round(price, 2)


async def assign_driver(db: AsyncIOMotorDatabase, booking_id: str, transport_type: str):
    driver = await db["drivers"].find_one({"transport_type": transport_type, "is_available": True})
    if driver:
        await db["bookings"].update_one(
            {"_id": ObjectId(booking_id)}, 
            {"$set": {"driver_id": str(driver["_id"]), "status": "assigned"}}
        )
        await db["drivers"].update_one({"_id": driver["_id"]}, {"$set": {"is_available": False}})


async def create_booking(payload, user_id: str, db: AsyncIOMotorDatabase):
    price = await calculate_price(payload.distance_km, payload.weight_kg, payload.transport_type)
    doc = {
        "user_id": user_id,
        "from_location": payload.from_location,
        "to_location": payload.to_location,
        "transport_type": payload.transport_type,
        "goods_type": payload.goods_type,
        "distance_km": payload.distance_km,
        "weight_kg": payload.weight_kg,
        "price": price,
        "status": "created",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["bookings"].insert_one(doc)
    booking_id = str(result.inserted_id)
    await assign_driver(db, booking_id, payload.transport_type)
    booking = await db["bookings"].find_one({"_id": ObjectId(booking_id)})
    return mongo_id(booking)


def mongo_id(data: dict) -> dict:
    if data and "_id" in data:
        data["id"] = str(data.pop("_id"))
    return data
