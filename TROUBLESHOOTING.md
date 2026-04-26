# 🛠️ QuickHaul: Kubernetes & Helm Troubleshooting Guide

This guide documents the common issues encountered during the migration to a production-grade Kubernetes/Helm architecture and their resolutions.

---

## 1. 💾 Storage Errors
### Issue: `spec.persistentvolumesource is immutable after creation`
*   **Symptom**: `kubectl apply` fails when changing an NFS path or server IP.
*   **Cause**: Kubernetes prevents changing the source of a Persistent Volume (PV) after it is created to protect data.
*   **Fix**: 
    1.  Delete the old PV: `kubectl delete pv <pv-name>`
    2.  Apply the new manifest: `kubectl apply -f ...`

---

## 2. 🎡 Helm & Deployment Errors
### Issue: `invalid ownership metadata`
*   **Symptom**: `helm install` fails saying a resource "exists and cannot be imported."
*   **Cause**: The resource already exists and was created either manually or by a different Helm release name.
*   **Fix**: Delete the existing resource manually: `kubectl delete <type> <name> -n <ns>`

### Issue: `nil pointer evaluating interface {}.nodePort`
*   **Symptom**: Helm installation fails with a "nil pointer" error.
*   **Cause**: The template is trying to access a value (e.g., `.Values.global.nodePort`) missing from the values file.
*   **Fix**: Ensure you are passing the global values: `helm install -f global-values.yaml`

---

## 3. 🌐 HAProxy 503 Service Unavailable
**Problem:** Accessing the EC2 IP returns a 503 error.
*   **Reason:** HAProxy cannot reach the Kubernetes NodePort or the Gateway is not running.
*   **Solution:**
    1.  Verify the Gateway is running and has the correct NodePort: `kubectl get svc -n quick-haul`
    2.  Check if you can reach the NodePort directly from the EC2: `curl http://localhost:30080`
    3.  Verify the Worker Node IPs in `/etc/haproxy/haproxy.cfg` are correct.

---

## 4. 🗄️ Database Not Persistent
**Problem:** Data is lost after a MongoDB pod restart.
*   **Reason:** The StatefulSet is not correctly using the PersistentVolumeClaim.
*   **Solution:**
    1.  Check the PVC status: `kubectl get pvc -n quick-haul`
    2.  Ensure your cluster has a **StorageClass**.

---

## 5. 📧 Email / OTP Not Sending
**Problem:** Registration fails or OTPs are not received.
*   **Reason:** Incorrect SMTP credentials or the Notification service is not reachable.
*   **Solution:**
    1.  Check `notification-service` logs: `kubectl logs -l app=notification-service -n quick-haul`
    2.  Verify your Gmail App Password in `secrets.yaml` is correct (16 characters, no extra letters).

---

## 🚧 6. Nginx: "host not found in upstream" (Frontend)
**Problem:** Frontend pod crashes with Exit Code 1. Logs show `[emerg] host not found in upstream "auth_service"`.
*   **Reason:** The Nginx configuration inside the container is trying to proxy to services using hardcoded names that don't exist in K8s.
*   **Solution:** Simplify `nginx.conf` to ONLY serve static files. Let **Envoy Gateway** handle the proxying.

---

## 🔗 7. PV: "already bound to a different claim"
**Problem:** MongoDB pod stays in `Pending` with `FailedBinding` warning.
*   **Reason:** The PersistentVolume was created with a `Retain` policy and is still "remembering" an old PVC.
*   **Solution:** Delete and recreate the PV manually.

---

## 🐍 8. Uvicorn: "Could not import module main"
**Problem:** Python services crash with `Error loading ASGI app`.
*   **Reason:** The startup command cannot find the `main.py` file because of the folder structure.
*   **Solution:** Use the full module path: `command: ["uvicorn", "services.auth_service.main:app", ...]`

---

## 🛠️ Useful Commands
*   **Get everything**: `kubectl get all -n quick-haul`
*   **Describe a failing pod**: `kubectl describe pod <pod-name> -n quick-haul`
*   **Check Resource Usage**: `kubectl top pods -n quick-haul`

---

## ✨ NEW: 21. Gateway URL Rewrite 404
**Problem:** API requests return 404 despite hitting the correct service.
*   **Reason:** The backend service doesn't expect the prefix (e.g., `/api/bookings` becomes `/bookings/bookings`).
*   **Solution:** Change `replacePrefixMatch` in the `HTTPRoute` to `/` to send the clean path to the app.

---

## ✨ NEW: 22. SMTP App Password Typos
**Problem:** `SMTP Authentication failed - check username/password`.
*   **Reason:** Extra characters (like a trailing 'r') or spaces in the App Password.
*   **Solution:** Ensure the password is exactly 16 characters. **Restart the pod** after updating the secret:
    `kubectl rollout restart deployment notification-service`

---

## ✨ NEW: 23. Cluster vs. Local Sync
**Problem:** Changes made locally are not reflected in the cluster.
*   **Reason:** Files on the AWS server are not synced with the local AI-edited files.
*   **Solution:** Manually update the files on the server using `sed` or re-upload the `helm-charts` folder before running `helm install`.

---

## ✨ NEW: 24. Deployment: "selector does not match template labels"
**Problem:** `helm install` fails with "invalid: spec.selector: Required value."
*   **Reason:** Kubernetes requires a `selector` block in the Deployment spec that exactly matches the labels in the Pod template. 
*   **Solution:** Ensure the `spec.selector.matchLabels` and `spec.template.metadata.labels` have the same `app: <name>` tag.

---

## ✨ NEW: 25. Python: "ModuleNotFoundError: No module named 'data'"
**Problem:** The app crashes during startup even though the code is correct.
*   **Reason:** The container is missing environment variables like `PYTHONPATH`, usually because the `envFrom` block is missing in the Helm template.
*   **Solution:** Add the `envFrom` block to the container spec to import the ConfigMap and Secrets:
    ```yaml
    envFrom:
    - configMapRef:
        name: quick-haul-config
    - secretRef:
        name: quick-haul-secrets
    ```
