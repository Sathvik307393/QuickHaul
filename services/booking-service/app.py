

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import redis
import json
from datetime import datetime, timedelta
import uuid
import re
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import redis
import json
from datetime import datetime, timedelta
import uuid
import re
import httpx
import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from data.indian_locations import get_center_by_id
from fastapi import Depends
from shared.security import get_current_user_id
from shared.config import settings
from shared.database import connect_to_db, get_db, close_db

@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_to_db()
    yield
    await close_db()

app = FastAPI(title="Booking Service", version="2.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis_client = redis.from_url(settings.redis_url, db=1, decode_responses=True)

# Pricing configuration (Realistic Indian Market Rates based on weight)
# Weight categories: light, medium, heavy
PRICING_CONFIG = {
    "bike": {
        "light": {"base_rate": 30, "per_km": 2, "gst_rate": 0.18},
        "medium": {"base_rate": 40, "per_km": 5, "gst_rate": 0.18},
        "heavy": {"base_rate": 50, "per_km": 8, "gst_rate": 0.18}
    },
    "van": {
        "light": {"base_rate": 80, "per_km": 10, "gst_rate": 0.18},
        "medium": {"base_rate": 120, "per_km": 17, "gst_rate": 0.18},
        "heavy": {"base_rate": 150, "per_km": 25, "gst_rate": 0.18}
    },
    "truck": {
        "light": {"base_rate": 200, "per_km": 15, "gst_rate": 0.18},
        "medium": {"base_rate": 350, "per_km": 28, "gst_rate": 0.18},
        "heavy": {"base_rate": 500, "per_km": 40, "gst_rate": 0.18}
    }
}

class BookingRequest(BaseModel):
    name: str
    phone: str
    email: EmailStr
    from_state: str
    from_district: str
    from_center: str
    to_state: str
    to_district: str
    to_center: str
    date: str
    time: str
    transport_type: str
    goods_type: str
    weight_category: str = "medium"  # light, medium, heavy
    from_center_details: Optional[dict] = None
    to_center_details: Optional[dict] = None

class BookingResponse(BaseModel):
    booking_id: str
    status: str
    total_amount: float
    base_amount: float
    gst_amount: float
    estimated_delivery: str

def validate_phone(phone: str) -> bool:
    """Validate Indian mobile number"""
    pattern = r'^[6-9]\d{9}$'
    return bool(re.match(pattern, phone))

def validate_date_time(date_str: str, time_str: str) -> bool:
    """Validate that date and time are not in the past"""
    try:
        booking_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        return booking_datetime > datetime.now()
    except:
        return False

def generate_booking_id() -> str:
    """Generate unique booking ID"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = str(uuid.uuid4())[:8].upper()
    return f"QT{timestamp}{random_suffix}"

def calculate_distance(req: BookingRequest) -> float:
    """Estimate distance based on location hierarchy"""
    if req.from_center == req.to_center:
        return 5.0
    if req.from_district == req.to_district:
        return 25.0
    if req.from_state == req.to_state:
        return 180.0
    return 850.0

def calculate_booking_amount(transport_type: str, distance_km: float, weight_category: str = "medium") -> dict:
    """Calculate booking amount with GST based on transport type and weight"""
    if transport_type not in PRICING_CONFIG:
        transport_type = "van"
    
    if weight_category not in ["light", "medium", "heavy"]:
        weight_category = "medium"
    
    config = PRICING_CONFIG[transport_type][weight_category]
    base_amount = config["base_rate"] + (config["per_km"] * distance_km)
    gst_amount = base_amount * config["gst_rate"]
    total_amount = base_amount + gst_amount
    
    return {
        "base_amount": round(base_amount, 2),
        "gst_amount": round(gst_amount, 2),
        "total_amount": round(total_amount, 2),
        "distance": distance_km,
        "weight_category": weight_category
    }

def get_estimated_delivery(transport_type: str) -> str:
    """Get estimated delivery time based on transport type"""
    delivery_times = {
        "bike": "2-4 hours",
        "van": "4-6 hours", 
        "truck": "6-8 hours"
    }
    return delivery_times.get(transport_type, "4-6 hours")

@app.get("/bookings", response_model=List[dict])
async def get_user_bookings(user_id: str = Depends(get_current_user_id)):
    """Get all bookings for the authenticated user from MongoDB"""
    db = get_db()
    cursor = db["bookings"].find({"user_id": user_id}).sort("created_at", -1)
    
    bookings = []
    async for booking in cursor:
        # Format for frontend
        locs = booking.get("locations", {})
        f_center = locs.get("from", {}).get("center", {})
        t_center = locs.get("to", {}).get("center", {})
        
        from_loc = f_center.get("name", str(f_center)) if isinstance(f_center, dict) else str(f_center)
        to_loc = t_center.get("name", str(t_center)) if isinstance(t_center, dict) else str(t_center)

        bookings.append({
            "id": booking["booking_id"],
            "from_location": from_loc,
            "to_location": to_loc,
            "transport_type": booking.get("transport", {}).get("type", "Unknown"),
            "goods_type": booking.get("transport", {}).get("goods_type", "General"),
            "status": booking.get("status", "unknown"),
            "price": f"₹{booking.get('pricing', {}).get('total_amount', 0)}",
            "date": booking.get("schedule", {}).get("date"),
            "time": booking.get("schedule", {}).get("time")
        })
    return bookings

@app.post("/bookings", response_model=BookingResponse)
async def create_booking(booking: BookingRequest, user_id: str = Depends(get_current_user_id)):
    """Create a new booking"""
    
    # Validate phone number
    if not validate_phone(booking.phone):
        raise HTTPException(status_code=400, detail="Invalid Indian mobile number format")
    
    # Validate date and time
    if not validate_date_time(booking.date, booking.time):
        raise HTTPException(status_code=400, detail="Booking date and time cannot be in the past")
    
    # Validate transport type
    if booking.transport_type not in PRICING_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid transport type")
    
    # Calculate distance
    distance_km = calculate_distance(booking)
    
    # Calculate amount with weight category
    amount_details = calculate_booking_amount(booking.transport_type, distance_km, booking.weight_category)
    
    # Generate booking ID
    booking_id = generate_booking_id()
    
    # Create booking record
    booking_data = {
        "booking_id": booking_id,
        "customer": {
            "name": booking.name,
            "phone": booking.phone,
            "email": booking.email
        },
        "locations": {
            "from": {
                "state": booking.from_state,
                "district": booking.from_district,
                "center": booking.from_center_details or booking.from_center
            },
            "to": {
                "state": booking.to_state,
                "district": booking.to_district,
                "center": booking.to_center_details or booking.to_center
            }
        },
        "schedule": {
            "date": booking.date,
            "time": booking.time
        },
        "transport": {
            "type": booking.transport_type,
            "goods_type": booking.goods_type,
            "weight_category": booking.weight_category
        },
        "pricing": amount_details,
        "status": "confirmed",
        "estimated_delivery": get_estimated_delivery(booking.transport_type),
        "created_at": datetime.now().isoformat()
    }
    
    # Store in MongoDB for persistence
    db = get_db()
    booking_data["user_id"] = user_id
    await db["bookings"].insert_one(booking_data)
    
    # Also store in Redis for caching/quick access (1 hour TTL)
    redis_key = f"booking:{booking_id}"
    # Convert _id to string or remove it so json.dumps doesn't crash
    if "_id" in booking_data:
        booking_data["_id"] = str(booking_data["_id"])
    redis_client.setex(redis_key, timedelta(hours=1), json.dumps(booking_data))
    
    # Send notifications (integrated with Notification Service)
    notification_url = settings.notification_service_url
    
    from_loc = booking_data['locations']['from']['center']['name'] if isinstance(booking_data['locations']['from']['center'], dict) else booking_data['locations']['from']['center']
    to_loc = booking_data['locations']['to']['center']['name'] if isinstance(booking_data['locations']['to']['center'], dict) else booking_data['locations']['to']['center']
    
    email_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background: #f0f2f5; }}
        .email-wrapper {{ max-width: 680px; margin: 0 auto; background: #ffffff; }}
        .email-container {{ box-shadow: 0 20px 60px rgba(0,0,0,0.15); border-radius: 16px; overflow: hidden; }}
        
        /* Premium Header */
        .header {{ 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
        }}
        .header::before {{
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }}
        .header-content {{ position: relative; z-index: 1; }}
        .logo-badge {{ 
            background: rgba(255,255,255,0.2); 
            backdrop-filter: blur(10px);
            border-radius: 50%; 
            width: 70px; height: 70px; 
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px; font-size: 32px;
            border: 2px solid rgba(255,255,255,0.3);
        }}
        .header h1 {{ margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }}
        .header p {{ margin: 10px 0 0; font-size: 16px; opacity: 0.95; font-weight: 500; }}
        .confirmation-badge {{ 
            display: inline-block; background: #10b981; color: white;
            padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600;
            margin-top: 20px; text-transform: uppercase; letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }}
        
        /* Content Area */
        .content {{ padding: 40px 35px; background: #ffffff; }}
        .greeting {{ font-size: 18px; margin-bottom: 25px; color: #374151; }}
        .greeting strong {{ color: #111827; }}
        
        /* Tracking Card */
        .tracking-card {{ 
            background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%); 
            color: white; 
            padding: 25px 30px; 
            border-radius: 14px; 
            margin: 25px 0;
            box-shadow: 0 10px 40px rgba(30, 58, 138, 0.3);
        }}
        .tracking-label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 8px; }}
        .tracking-id {{ font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px; }}
        
        /* Sections */
        .section {{ margin: 30px 0; }}
        .section-header {{ 
            display: flex; align-items: center; gap: 10px;
            font-size: 14px; font-weight: 700; color: #4f46e5;
            text-transform: uppercase; letter-spacing: 0.5px;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e5e7eb;
        }}
        .section-icon {{ font-size: 18px; }}
        
        /* Detail Grid */
        .detail-grid {{ display: grid; gap: 14px; }}
        .detail-item {{ 
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 16px; background: #f9fafb; border-radius: 10px;
            border-left: 3px solid #e5e7eb;
        }}
        .detail-item.highlight {{ border-left-color: #4f46e5; background: #eef2ff; }}
        .detail-label {{ font-size: 13px; color: #6b7280; font-weight: 500; }}
        .detail-value {{ font-size: 14px; color: #111827; font-weight: 600; }}
        
        /* Billing Section */
        .billing-section {{ 
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); 
            border: 2px solid #fdba74;
            border-radius: 14px; 
            padding: 25px;
            margin-top: 25px;
        }}
        .billing-row {{ 
            display: flex; justify-content: space-between; 
            padding: 12px 0; border-bottom: 1px dashed #fed7aa;
        }}
        .billing-row:last-child {{ border-bottom: none; }}
        .billing-label {{ font-size: 14px; color: #7c2d12; font-weight: 500; }}
        .billing-value {{ font-size: 14px; color: #9a3412; font-weight: 600; }}
        .total-row {{ 
            background: #ea580c; color: white;
            margin: 20px -25px -25px; padding: 20px 25px;
            border-radius: 0 0 12px 12px;
            display: flex; justify-content: space-between; align-items: center;
        }}
        .total-label {{ font-size: 16px; font-weight: 700; }}
        .total-value {{ font-size: 28px; font-weight: 800; }}
        
        /* CTA Button */
        .cta-container {{ text-align: center; margin: 35px 0 20px; }}
        .track-btn {{ 
            display: inline-block; 
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white; 
            padding: 16px 40px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: 700; 
            font-size: 15px;
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
            transition: transform 0.2s;
        }}
        
        /* Footer */
        .footer {{ 
            background: #1f2937; color: #9ca3af;
            padding: 30px; text-align: center; font-size: 13px;
        }}
        .footer-brand {{ font-size: 18px; font-weight: 700; color: #f3f4f6; margin-bottom: 8px; }}
        .footer-links {{ margin: 15px 0; }}
        .footer-links a {{ color: #6b7280; text-decoration: none; margin: 0 10px; }}
        
        /* Mobile */
        @media (max-width: 600px) {{
            .content {{ padding: 25px 20px; }}
            .header {{ padding: 30px 20px; }}
            .header h1 {{ font-size: 26px; }}
            .tracking-id {{ font-size: 20px; }}
            .total-value {{ font-size: 24px; }}
        }}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <!-- Premium Header -->
            <div class="header">
                <div class="header-content">
                    <div class="logo-badge">🚛</div>
                    <h1>QuickHaul</h1>
                    <p>India's Trusted Logistics Partner</p>
                    <div class="confirmation-badge">✓ Booking Confirmed</div>
                </div>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Dear <strong>{booking.name}</strong>,
                </div>
                <p style="color: #6b7280; margin-bottom: 25px;">Thank you for choosing QuickHaul! Your freight booking has been successfully confirmed. We're committed to delivering your goods safely and on time.</p>
                
                <!-- Tracking Card -->
                <div class="tracking-card">
                    <div class="tracking-label">Tracking ID</div>
                    <div class="tracking-id">{booking_id}</div>
                </div>
                
                <!-- Booking Details -->
                <div class="section">
                    <div class="section-header">
                        <span class="section-icon">📅</span>
                        <span>Booking Details</span>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Pickup Date</span>
                            <span class="detail-value">{booking.date}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Pickup Time</span>
                            <span class="detail-value">{booking.time}</span>
                        </div>
                        <div class="detail-item highlight">
                            <span class="detail-label">Transport Type</span>
                            <span class="detail-value">{booking.transport_type.upper()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Goods Type</span>
                            <span class="detail-value">{booking.goods_type}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Weight Category</span>
                            <span class="detail-value">{booking.weight_category.upper()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Est. Delivery</span>
                            <span class="detail-value">{get_estimated_delivery(booking.transport_type)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Route Information -->
                <div class="section">
                    <div class="section-header">
                        <span class="section-icon">🚚</span>
                        <span>Route Information</span>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Pickup Location</span>
                            <span class="detail-value">{from_loc}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Delivery Location</span>
                            <span class="detail-value">{to_loc}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Distance</span>
                            <span class="detail-value">{distance_km} km</span>
                        </div>
                    </div>
                </div>
                
                <!-- Billing Summary -->
                <div class="billing-section">
                    <div class="section-header" style="border-bottom-color: #fdba74; margin-top: 0;">
                        <span class="section-icon">💰</span>
                        <span>Billing Summary</span>
                    </div>
                    <div class="billing-row">
                        <span class="billing-label">Base Amount</span>
                        <span class="billing-value">₹{amount_details['base_amount']}</span>
                    </div>
                    <div class="billing-row">
                        <span class="billing-label">GST (18%)</span>
                        <span class="billing-value">₹{amount_details['gst_amount']}</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">TOTAL PAYABLE</span>
                        <span class="total-value">₹{amount_details['total_amount']}</span>
                    </div>
                </div>
                
                <!-- CTA -->
                <div class="cta-container">
                    <a href="{settings.frontend_url}/track/{booking_id}" class="track-btn">Track Your Shipment</a>
                </div>
                
                <p style="text-align: center; color: #9ca3af; font-size: 13px; margin-top: 20px;">
                    Need help? Contact our support team at <a href="mailto:support@quickhaul.com" style="color: #4f46e5;">support@quickhaul.com</a>
                </p>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-brand">🚛 QuickHaul</div>
                <p>Reliable logistics solutions across India</p>
                <div class="footer-links">
                    <a href="#">Website</a> | 
                    <a href="#">Support</a> | 
                    <a href="#">Terms</a>
                </div>
                <p style="font-size: 11px; color: #6b7280; margin-top: 15px;">
                    This is an automated email. Please do not reply directly to this message.
                </p>
            </div>
        </div>
    </div>
</body>
</html>"""

    try:
        async with httpx.AsyncClient() as client:
            # Send Email (Primary Priority)
            email_resp = await client.post(
                f"{notification_url}/send-email",
                json={
                    "to_email": booking.email,
                    "subject": f"QuickHaul Booking Confirmation: {booking_id}",
                    "body": email_body
                },
                timeout=20.0
            )
            print(f"Email service response: {email_resp.status_code}")
            
            # Send SMS (Secondary Priority)
            sms_resp = await client.post(
                f"{notification_url}/send-sms",
                json={
                    "phone": booking.phone,
                    "message": f"QuickHaul: Booking {booking_id} confirmed. Total: ₹{amount_details['total_amount']}. Track at: {settings.frontend_url}/track/{booking_id}"
                },
                timeout=10.0
            )
            print(f"SMS service response: {sms_resp.status_code}")
            print(f"Notifications dispatched for {booking_id}")
    except Exception as e:
        print(f"Failed to send notifications: {e}")
    
    return BookingResponse(
        booking_id=booking_id,
        status="confirmed",
        total_amount=amount_details["total_amount"],
        base_amount=amount_details["base_amount"],
        gst_amount=amount_details["gst_amount"],
        estimated_delivery=get_estimated_delivery(booking.transport_type)
    )

@app.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    """Get booking details by ID"""
    booking_key = f"booking:{booking_id}"
    booking_data = redis_client.get(booking_key)
    
    if not booking_data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return json.loads(booking_data)

@app.get("/bookings/customer/{phone}")
async def get_customer_bookings(phone: str):
    """Get all bookings for a customer"""
    customer_key = f"customer:{phone}:bookings"
    booking_ids = redis_client.lrange(customer_key, 0, -1)
    
    bookings = []
    for booking_id in booking_ids:
        booking_key = f"booking:{booking_id}"
        booking_data = redis_client.get(booking_key)
        if booking_data:
            bookings.append(json.loads(booking_data))
    
    return {"bookings": bookings}

@app.get("/pricing/{transport_type}")
async def get_pricing(transport_type: str, distance_km: float = 10):
    """Get pricing for transport type"""
    if transport_type not in PRICING_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid transport type")
    
    amount_details = calculate_booking_amount(transport_type, distance_km)
    return {
        "transport_type": transport_type,
        "distance_km": distance_km,
        **amount_details
    }

@app.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str):
    """Cancel a booking"""
    booking_key = f"booking:{booking_id}"
    booking_data = redis_client.get(booking_key)
    
    if not booking_data:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = json.loads(booking_data)
    
    # Check if booking can be cancelled (e.g., not too close to pickup time)
    booking_datetime = datetime.strptime(f"{booking['schedule']['date']} {booking['schedule']['time']}", "%Y-%m-%d %H:%M")
    if booking_datetime - datetime.now() < timedelta(hours=2):
        raise HTTPException(status_code=400, detail="Cannot cancel booking less than 2 hours before pickup")
    
    # Update booking status
    booking["status"] = "cancelled"
    booking["cancelled_at"] = datetime.now().isoformat()
    
    redis_client.setex(booking_key, timedelta(days=30), json.dumps(booking))
    
    return {"message": "Booking cancelled successfully", "booking_id": booking_id}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        redis_client.ping()
        return {"status": "healthy", "redis": "connected"}
    except:
        return {"status": "unhealthy", "redis": "disconnected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
