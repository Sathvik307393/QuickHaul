# ⚓ QuickHaul Kubernetes Microservices

Professional, scalable Kubernetes deployment for the QuickHaul transport platform. This project uses a modern microservices architecture with Gateway API (Envoy), StatefulSets for databases, and HAProxy for external load balancing.

---

## 🏗️ Architecture Overview

1.  **HAProxy (EC2)**: External entry point. Routes traffic to K8s nodes on NodePort `30080`.
2.  **Envoy Gateway (K8s)**: Handles internal path-based routing (`/auth`, `/booking`, etc.).
3.  **Microservices**: Frontend and multiple Backend services (FastAPI) running as independent Pods.
4.  **Database**: MongoDB running as a **StatefulSet** using **NFS Persistent Storage**.

---

## 📁 Project Structure
```text
/kubernetes
  ├── auth-service/         # Auth Deployment & Service
  ├── booking-service/      # Booking Deployment & Service
  ├── location-service/     # Location Deployment & Service
  ├── notification-service/ # Notification Deployment & Service
  ├── otp-service/          # OTP Deployment & Service
  ├── frontend/             # React Frontend Deployment & Service
  ├── database/             # MongoDB StatefulSet, Redis, & NFS PV/PVC
  ├── gateway/              # Envoy Gateway & HTTPRoutes
  ├── namespace.yaml        # 'quick-haul' namespace
  ├── configmap.yaml        # Global Env variables
  └── secrets.yaml          # Sensitive credentials (JWT, SMTP)
/haproxy
  └── haproxy.cfg           # External Load Balancer config
```

---

## 🛠️ Step 1: Infrastructure Prerequisites

### 1. Setup NFS Storage (on a Worker Node)
Run these on the selected node:
```bash
sudo apt update && sudo apt install nfs-kernel-server -y
sudo mkdir -p /mnt/nfs/mongodb
sudo chown nobody:nogroup /mnt/nfs/mongodb
sudo chmod 777 /mnt/nfs/mongodb
echo "/mnt/nfs/mongodb *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -a && sudo systemctl restart nfs-kernel-server
```
**Note:** Ensure all other nodes have `nfs-common` installed: `sudo apt install nfs-common -y`.

### 2. Install Envoy Gateway Controller
Run this on your Master node:
```bash
kubectl apply -f https://github.com/envoyproxy/gateway-api/releases/latest/download/install.yaml
```

---

## 🚀 Step 2: Deployment Sequence

Follow this order to ensure all dependencies are met:

```bash
# 1. Create Namespace
kubectl apply -f kubernetes/namespace.yaml

# 2. Apply Config & Secrets
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# 3. Setup Storage (Update IP in nfs-pv.yaml first!)
kubectl apply -f kubernetes/database/nfs-pv.yaml

# 4. Deploy Databases
kubectl apply -f kubernetes/database/mongodb.yaml
kubectl apply -f kubernetes/database/redis.yaml

# 5. Deploy Gateway & Application
kubectl apply -f kubernetes/gateway/gateway.yaml
kubectl apply -R -f kubernetes/
```

---

## 🔐 Step 3: Security (SealedSecrets)

To encrypt your `secrets.yaml` for safe Git storage:
1.  **Install kubeseal**:
    ```bash
    wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.4/kubeseal-0.24.4-linux-amd64.tar.gz
    sudo install -m 755 kubeseal /usr/local/bin/kubeseal
    ```
2.  **Seal the Secret**:
    ```bash
    kubeseal --format=yaml < kubernetes/secrets.yaml > kubernetes/sealed-secrets.yaml
    rm kubernetes/secrets.yaml # Safe to delete plain secret now
    ```

---

## 📡 Step 4: External Access (HAProxy)

1.  Copy `haproxy/haproxy.cfg` to your EC2 `/etc/haproxy/haproxy.cfg`.
2.  Update the `server` lines with your **Worker Node Private IPs**.
3.  Restart HAProxy: `sudo systemctl restart haproxy`.

---

## 🔍 Troubleshooting
Refer to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions to common errors.
