# 🛠️ QuickHaul Troubleshooting Guide

This guide provides solutions to common issues you might encounter during the Kubernetes deployment on your EC2 instance.

---

## 1. 🖼️ ImagePullBackOff / ErrImagePull
**Problem:** Kubernetes is unable to pull the Docker image from the registry.
*   **Reason:** Either the image name/tag is wrong, or the repository is private and Kubernetes doesn't have the `imagePullSecret`.
*   **Solution:**
    1.  Verify image tags in `kubernetes/<service>/deployment.yaml` match exactly what you pushed:
        ```bash
        docker images # On your local build machine
        ```
    2.  If the repo is private, log in and create a secret:
        ```bash
        kubectl create secret docker-registry regcred --docker-server=https://index.docker.io/v1/ --docker-username=<user> --docker-password=<token> --docker-email=<email> -n quick-haul
        ```
        Then add `imagePullSecrets: [{name: regcred}]` to your deployment.

---

## 2. 🔄 CrashLoopBackOff
**Problem:** The container starts but immediately crashes.
*   **Reason:** Usually a missing environment variable, incorrect database URL, or a port conflict.
*   **Solution:**
    1.  Check the logs:
        ```bash
        kubectl logs <pod-name> -n quick-haul
        ```
    2.  Verify the `ConfigMap` and `Secrets` are applied:
        ```bash
        kubectl get configmap quick-haul-config -n quick-haul -o yaml
        kubectl get secret quick-haul-secrets -n quick-haul -o yaml
        ```

---

## 3. 🌐 HAProxy 503 Service Unavailable
**Problem:** Accessing the EC2 IP returns a 503 error.
*   **Reason:** HAProxy cannot reach the Kubernetes NodePort or the Gateway is not running.
*   **Solution:**
    1.  Verify the Gateway is running and has the correct NodePort:
        ```bash
        kubectl get svc -n quick-haul
        ```
    2.  Check if you can reach the NodePort directly from the EC2:
        ```bash
        curl http://localhost:30080
        ```
    3.  Verify the Worker Node IPs in `/etc/haproxy/haproxy.cfg` are correct.

---

## 4. 🗄️ Database Not Persistent
**Problem:** Data is lost after a MongoDB pod restart.
*   **Reason:** The StatefulSet is not correctly using the PersistentVolumeClaim.
*   **Solution:**
    1.  Check the PVC status:
        ```bash
        kubectl get pvc -n quick-haul
        ```
    2.  Ensure your cluster has a **StorageClass** (usually named `gp2` or `standard`):
        ```bash
        kubectl get storageclass
        ```

---

## 5. 📧 Email / OTP Not Sending
**Problem:** Registration fails or OTPs are not received.
*   **Reason:** Incorrect SMTP credentials or the Notification service is not reachable.
*   **Solution:**
    1.  Check `notification-service` logs:
        ```bash
        kubectl logs -l app=notification-service -n quick-haul
        ```
    2.  Verify your Gmail App Password in `secrets.yaml` is correct (and has no spaces).
    3.  Ensure `SMTP_ENABLED` is set to `"true"` in `configmap.yaml`.

---

## 🚧 6. Nginx: "host not found in upstream" (Frontend)
**Problem:** Frontend pod crashes with Exit Code 1. Logs show `[emerg] host not found in upstream "auth_service"`.
*   **Reason:** The Nginx configuration inside the container is trying to proxy to services using hardcoded names (with underscores) that don't exist in K8s.
*   **Solution:** 
    1. Simplify `nginx.conf` to ONLY serve static files. 
    2. Let the **Envoy Gateway** handle the proxying to `/auth`, `/booking`, etc.
    3. Rebuild the frontend image as `v3`.

---

## 🔗 7. PV: "already bound to a different claim"
**Problem:** MongoDB pod stays in `Pending` with `FailedBinding` warning.
*   **Reason:** The PersistentVolume was created with a `Retain` policy and is still "remembering" an old PVC from a previous deployment.
*   **Solution:**
    ```bash
    kubectl delete pv mongodb-nfs-pv
    kubectl apply -f kubernetes/database/nfs-pv.yaml
    ```

---

## 🐍 8. Uvicorn: "Could not import module main"
**Problem:** Python services crash with `Error loading ASGI app`.
*   **Reason:** The startup command cannot find the `main.py` file because of the folder structure.
*   **Solution:** Use the full module path in the deployment command:
    `command: ["uvicorn", "services.auth_service.main:app", ...]`

---

## 🛠️ Useful Commands
*   **Get everything**: `kubectl get all -n quick-haul`
*   **Describe a failing pod**: `kubectl describe pod <pod-name> -n quick-haul`
*   **Execute into a pod**: `kubectl exec -it <pod-name> -n quick-haul -- /bin/bash`
