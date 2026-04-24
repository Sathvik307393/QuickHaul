# Troubleshooting & Bug Fix Log: QuickHaul Microservices

This document tracks all the technical challenges encountered and resolved during the deployment of the QuickHaul project on AWS EC2.

## 🔍 Common Docker Troubleshooting

### 1. Stale Configuration (The most common issue)
**Symptoms**: Changes to `nginx.conf` or `Dockerfile` are not appearing in the running container.
**Reason**: Docker caches images and doesn't always rebuild them if only internal files have changed.
**Solution**: Force a rebuild of the specific service:
```bash
docker compose up --build -d <service_name>
```

### 2. Port Conflicts
**Symptoms**: "Address already in use" error when starting containers.
**Reason**: A standalone container (running outside of Docker Compose) or another process is already using the port (e.g., 80, 8001, 27017).
**Solution**: Find and stop the conflicting container:
```bash
docker ps  # Find the name
docker rm -f <container_name>
```

### 3. Outdated Docker Compose (KeyError: 'ContainerConfig')
**Symptoms**: `KeyError: 'ContainerConfig'` traceback when running `docker-compose up`.
**Reason**: You are using the old Python-based `docker-compose` (v1.x) which is incompatible with some newer Docker features.
**Solution**: Use the modern Go-based plugin (v2.x) by removing the hyphen:
```bash
docker compose up -d
```

### 4. Missing Booking Emails (Priority Debugging)
**Symptoms**: OTP email is received, but the Booking confirmation email is missing.
**Reason**: Likely a timeout or SMTP rejection due to the larger HTML body of the booking email.
**Solution**: Check the Notification Service logs to see the SMTP response:
```bash
docker logs dockerised_quick_haul_notification_service_1
```
Look for: `Email send result for user@example.com: {'success': False, 'error': '...'}`.

---

## 🐞 Bug Fix Log

### [Bug #001] 404 Not Found on Auth API
- **Symptoms**: Browser console showed `404 Not Found` for `/api/auth/login`.
- **Root Cause**: The Auth Service FastAPI app uses a prefix (`/auth`). The Nginx proxy was forwarding requests to the root (`/`) instead of the prefixed path.
- **Resolution**: Updated `frontend/nginx.conf` to map `/api/auth/` to `http://auth_service:8002/auth/`.

### [Bug #002] Emails not sending (Simulation Mode)
- **Symptoms**: System reports "Email sent" but nothing arrives in the inbox.
- **Root Cause**: `SMTP_ENABLED` was set to `False` by default in the code.
- **Resolution**: Created a root `.env` file and set `SMTP_ENABLED=True` along with real SMTP credentials.

### [Bug #003] Environment Variables not reaching Backend
- **Symptoms**: Backend was still using `localhost` even though Docker Compose was running.
- **Root Cause**: The services weren't explicitly told to look for the root `.env` file.
- **Resolution**: Updated `docker-compose.yml` to include `env_file: .env` for each microservice.

### [Bug #004] 500 Error: ObjectId is not JSON serializable
- **Symptoms**: `POST /bookings` returns 500. Logs show `TypeError: Object of type ObjectId is not JSON serializable`.
- **Root Cause**: MongoDB adds an `_id` field of type `ObjectId` to the dictionary. The `json` library cannot serialize this type when saving to Redis.
- **Resolution**: Converted the `_id` field to a string using `str(booking_data["_id"])` before calling `json.dumps`.
