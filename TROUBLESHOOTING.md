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

---

## ?? 10. NodePort Service: "Endpoints: <none>"
**Problem:** kubectl get endpoints envoy-gateway-nodeport shows <none>. HAProxy gives a 503 error.
*   **Reason:** The Service selector in your YAML does not match the labels on the Envoy pods created by the controller.
*   **Solution:**
    1. Find the labels on the proxy pods:
       `ash
       kubectl get pods -n envoy-gateway-system --show-labels
       `
    2. Update your Service manifest to use the correct labels (e.g., gateway.envoyproxy.io/owning-gateway-name: quickhaul-gateway).
    3. Re-apply the manifest.

---

## ??? 11. Cross-Namespace Service Selection
**Problem:** A Service has the correct labels but still shows Endpoints: <none>.
*   **Reason:** In Kubernetes, a Service can only connect to Pods that are in the **same namespace**. If your Envoy pods are in envoy-gateway-system but your Service is in quick-haul, they will never connect.
*   **Solution:** Move the Service manifest to the same namespace as the pods (e.g., set 
amespace: envoy-gateway-system in your NodePort service manifest).

---

## ??? 12. Envoy: "targetPort: 10080"
**Problem:** Connection Refused on port 80 inside the pod.
*   **Reason:** By default, the Envoy Proxy container created by Envoy Gateway listens on port 10080 for HTTP traffic, not port 80.
*   **Solution:** Update your Service manifest to use 	argetPort: 10080.

---

## ?? 13. API: "405 Method Not Allowed"
**Problem:** Frontend (Nginx) returns 405 on POST requests to /api/....
*   **Reason:** The HTTPRoute paths in your Gateway do not match the paths your React app is calling. The request falls through to the static frontend server.
*   **Solution:** Update HTTPRoute to include the correct prefix (e.g., /api/auth instead of /auth).

---

## ?? 14. Backend: "404 Not Found" (Path Rewrite)
**Problem:** API requests return 404 despite hitting the correct service.
*   **Reason:** The backend service doesn't expect the /api prefix. The Gateway is passing the full URL instead of stripping it.
*   **Solution:** Add a URLRewrite filter to the HTTPRoute to strip or replace the prefix (e.g., replace /api/auth with /auth).

---

## ?? 15. NFS Mount: "exit status 32"
**Problem:** Pods stuck in ContainerCreating with error mount failed: exit status 32.
*   **Reason:** The Worker Node is missing the 
fs-common package and cannot "speak" the NFS protocol.
*   **Solution:** Run sudo apt-get update && sudo apt-get install -y nfs-common on ALL worker nodes.

---

## ?? 16. Database: "RuntimeError: MongoDB is not connected"
**Problem:** The app says DB is disconnected even though the MongoDB pod is Running.
*   **Reason:** The app tried to connect during startup while the DB was still booting/failing and didn't retry.
*   **Solution:** Restart the application pods to force a fresh connection:
    `ash
    kubectl rollout restart deployment -n quick-haul [service-name]
    `

---

## ?? 17. SMTP: "Bad Credentials" (Gmail)
**Problem:** Error (535, b'5.7.8 Username and Password not accepted').
*   **Reason:** Google blocks regular account passwords for automated apps.
*   **Solution:**
    1. Enable 2-Step Verification in Google Account.
    2. Search for "App Passwords."
    3. Create a 16-character password for "QuickHaul."
    4. Update secrets.yaml with this new code.

---

## ?? 18. Helm: "YAML parse error"
**Problem:** Error: INSTALLATION FAILED: YAML parse error on ... could not find expected ':'.
*   **Reason:** This happens if the image: keyword or a colon is accidentally deleted during variable injection in a template.
*   **Solution:** Check the line number in the error message. Ensure the format is strictly: image: {{ .Values.global.images.NAME }} (with a colon and exactly one space).

---

## ?? 19. Helm: "Dry-run is deprecated"
**Note:** In newer Helm versions, --dry-run shows a warning.
*   **Fix:** Use --dry-run=client to check local syntax or --dry-run=server to check against the live cluster.
