# Enhanced Transport Booking System

A comprehensive transport booking web application with Indian location support, dynamic pricing, and real-time booking management.

## 🚀 Features

### Frontend (React)
- **Wide 2-3 Column Grid Layout** - Responsive design with minimal scrolling
- **Dynamic Location Selection** - State → District → Center cascading dropdowns
- **Real-time Form Validation** - Phone, email, and date validation
- **Professional UI** - Modern design with transport-specific styling
- **Interactive Vehicle Selection** - Visual cards with capacity information

### Backend Services
- **Location Service** (Port 8001) - Indian states, districts, and centers with Redis caching
- **Booking Service** (Port 8003) - Booking management with GST calculation
- **Auth Service** (Port 8002) - User authentication and authorization
- **Notification Service** (Port 8004) - Email and SMS notifications

### Data Management
- **MongoDB** - Booking and user data storage
- **Redis** - Location data caching (1-hour TTL)
- **Indian Location Data** - 6 states, 12 districts, 24+ centers

## 📍 Supported Locations

### States
- Karnataka
- Maharashtra  
- Delhi
- Andhra Pradesh
- Tamil Nadu
- Kerala

### Example Centers
- Bangalore: MG Road, Electronic City
- Mumbai: Nariman Point, Andheri
- Delhi: Connaught Place, Nehru Place
- Chennai: T Nagar, OMR
- And more...

## 💰 Pricing Structure

| Vehicle Type | Base Rate | Per KM Rate | GST |
|-------------|-----------|-------------|-----|
| 🏍️ Bike    | ₹50       | ₹8/km       | 18% |
| 🚐 Van      | ₹150      | ₹15/km      | 18% |
| 🚚 Truck    | ₹300      | ₹25/km      | 18% |

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB
- Redis

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Start Services**
```bash
python start_services.py
```

This will start:
- Location Service: http://localhost:8001
- Auth Service: http://localhost:8002  
- Booking Service: http://localhost:8003
- Notification Service: http://localhost:8004

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

## 📡 API Endpoints

### Location Service (Port 8001)
```
GET /states                    # Get all Indian states
GET /districts?state={id}      # Get districts by state
GET /centers?state={id}&district={id}  # Get centers by district
DELETE /cache                  # Clear location cache
GET /health                    # Health check
```

### Booking Service (Port 8003)
```
POST /bookings                 # Create new booking
GET /bookings/{id}            # Get booking by ID
GET /bookings/customer/{phone} # Get customer bookings
GET /pricing/{type}?distance={km} # Get pricing info
DELETE /bookings/{id}         # Cancel booking
GET /health                   # Health check
```

## 📝 Booking Flow

1. **Customer Information**
   - Full Name, Phone, Email
   - Phone validation: 10-digit Indian mobile
   - Email validation: Standard email format

2. **Location Selection**
   - State → District → Center (cascading)
   - Center details shown on selection
   - Real address and contact information

3. **Booking Details**
   - Date & Time selection
   - Past dates automatically blocked
   - Transport type selection (Bike/Van/Truck)

4. **Confirmation**
   - Unique Booking ID generated (QT20231201123456ABC)
   - GST-inclusive pricing
   - Estimated delivery time

## 🔧 Configuration

### Environment Variables
```bash
# Frontend (.env)
VITE_LOCATION_API_URL=http://localhost:8001
VITE_BOOKING_API_URL=http://localhost:8003

# Backend (.env)
MONGODB_URL=mongodb://localhost:27017/transport
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Redis Cache Configuration
- **TTL**: 1 hour for location data
- **DB**: 0 for location service, 1 for booking service
- **Keys**: `states`, `districts:{state}`, `centers:{state}:{district}`

## 🧪 Testing

### API Testing
```bash
# Test location service
curl http://localhost:8001/states

# Test booking service
curl -X POST http://localhost:8003/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"9876543210","email":"john@example.com","state":"karnataka","district":"bangalore_urban","center":"bangalore_center_1","date":"2024-12-25","time":"10:00","transport_type":"bike","goods_type":"Documents"}'
```

### Frontend Testing
- Form validation
- Dynamic dropdowns
- Responsive design
- Cross-browser compatibility

## 📊 Monitoring

### Health Checks
- Location Service: http://localhost:8001/health
- Booking Service: http://localhost:8003/health

### API Documentation
- Location Service: http://localhost:8001/docs
- Booking Service: http://localhost:8003/docs

## 🔒 Security Features

- Input validation and sanitization
- Rate limiting on API endpoints
- Secure password hashing
- JWT token authentication
- CORS configuration

## 📈 Performance Optimizations

- Redis caching for location data
- Lazy loading of districts/centers
- Optimized database queries
- Efficient state management
- Minimal API calls

## 🚀 Deployment

### Docker Deployment (Coming Soon)
```bash
# Build and run all services
docker-compose up -d
```

### Production Considerations
- Use environment-specific configurations
- Implement proper logging
- Set up monitoring and alerting
- Configure backup strategies
- Use HTTPS in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check API documentation at `/docs` endpoints
- Review health check endpoints
- Check Redis and MongoDB connections
- Verify environment configurations

## 📋 TODO

- [ ] Email notification implementation
- [ ] SMS notification integration
- [ ] MongoDB integration (currently using Redis)
- [ ] Docker containerization
- [ ] Production deployment guide
- [ ] Load testing and optimization
- [ ] Advanced analytics dashboard
