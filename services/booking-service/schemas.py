from pydantic import BaseModel, Field
from typing import Optional


class BookingCreateRequest(BaseModel):
    from_location: str
    to_location: str
    transport_type: str
    goods_type: str
    distance_km: float = Field(gt=0)
    weight_kg: float = Field(gt=0)


class BookingResponse(BaseModel):
    id: str
    user_id: str
    from_location: str
    to_location: str
    transport_type: str
    goods_type: str
    price: float
    status: str
    driver_id: Optional[str] = None
