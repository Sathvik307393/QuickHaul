# QuickHaul: Command Cheat Sheet

This document contains all the essential commands for managing, debugging, and demonstrating the QuickHaul Microservices project.

## 🚀 Docker Compose Commands

### Start the entire system
```bash
docker compose up -d
```

### Rebuild and Restart (Use after a git pull)
```bash
docker compose up --build -d
```

### Stop all services
```bash
docker compose down
```

### Check logs for a specific service
```bash
docker logs dockerised_quick_haul_frontend_1
docker logs dockerised_quick_haul_auth_service_1
docker logs dockerised_quick_haul_booking_service_1
docker logs dockerised_quick_haul_notification_service_1
docker logs dockerised_quick_haul_otp_service_1
```

---

## 📂 Database Management

### MongoDB (Users & Shared Data)
1. **Enter MongoDB Shell**:
   ```bash
   docker exec -it dockerised_quick_haul_mongodb_1 mongosh
   ```
2. **Commands inside shell**:
   ```javascript
   show dbs                  // Show all databases
   use transport_booking     // Switch to project database
   show collections          // Show tables (users, etc.)
   db.users.find().pretty()  // View all users
   exit                      // Exit shell
   ```

### Redis (Bookings & OTPs)
1. **Enter Redis CLI**:
   ```bash
   docker exec -it dockerised_quick_haul_redis_1 redis-cli
   ```
2. **Commands inside CLI**:
   ```bash
   keys *              // Show all stored keys
   get booking:<ID>    // View a specific booking
   exit                // Exit CLI
   ```

---

## 💾 Physical Data Storage (Host Level)

### MongoDB Data Path
Your database files are stored physically on the EC2 host at:
`/var/lib/docker/volumes/dockerised_quick_haul_mongodb_data/_data`

**Command to view files**:
```bash
sudo ls -lh /var/lib/docker/volumes/dockerised_quick_haul_mongodb_data/_data
```

### Redis Data Path
Redis data (snapshots) are stored at:
`/var/lib/docker/volumes/dockerised_quick_haul_redis_data/_data` (if configured) or managed internally by Docker.

---

## 🛠️ Git Workflow (On Local machine)

### Push changes to EC2
```bash
git add .
git commit -m "Your message"
git push origin main
```

### Pull changes (On EC2)
```bash
git pull origin main
```

---

## 🌐 Network Troubleshooting
### Test Nginx routing
```bash
curl http://localhost/api/auth/health
```
### Test Backend directly
```bash
curl http://localhost:8002/auth/health
```
