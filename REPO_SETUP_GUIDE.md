# QuickHaul Microservices Repository Setup Guide

This guide helps you set up your project like fitforge101 with separate repositories for each microservice, proper branching strategy, and namespace mapping.

## Repository Structure

Create these 7 repositories in your GitHub organization:

| Repository | Purpose | Branch → Namespace Mapping |
|------------|---------|------------------------------|
| `quickhaul-frontend` | React/Vue frontend | main → prod, develop → dev |
| `quickhaul-auth-service` | Authentication service | main → prod, develop → dev |
| `quickhaul-booking-service` | Booking service | main → prod, develop → dev |
| `quickhaul-location-service` | Location service | main → prod, develop → dev |
| `quickhaul-notification-service` | Notification service | main → prod, develop → dev |
| `quickhaul-otp-service` | OTP service | main → prod, develop → dev |
| `quickhaul-charts` | Helm charts & K8s manifests | main → prod, develop → dev |

## Setup Steps

### 1. Create GitHub Organization (Optional)
Go to https://github.com/organizations/plan and create an organization (e.g., `quickhaul-org`)

### 2. Run the Repository Initialization Script

```powershell
# Update these variables
$GH_ORG = "your-org-name"  # or your username
$GH_TOKEN = "ghp_your_github_token"

# Run the setup script
.\scripts\initialize-repos.ps1
```

### 3. Migrate Service Code to Individual Repos

Each service repo should have this structure:
```
quickhaul-auth-service/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # Auto-generated
├── src/                        # Service source code
├── Dockerfile
├── requirements.txt (or package.json)
├── .gitignore
└── README.md
```

### 4. Helm Charts Repository Structure

```
quickhaul-charts/
├── .github/
│   └── workflows/
│       └── deploy.yml         # Environment-based deployment
├── charts/                     # Individual service charts
│   ├── auth-service/
│   ├── booking-service/
│   ├── location-service/
│   ├── notification-service/
│   ├── otp-service/
│   └── frontend/
├── environments/               # Environment-specific values
│   ├── prod/
│   │   └── values.yaml
│   └── dev/
│       └── values.yaml
├── templates/
│   ├── namespace-prod.yaml
│   └── namespace-dev.yaml
└── README.md
```

## Branching Strategy

```
feature/*  →  develop  →  main
                    ↓        ↓
                   dev      prod
                (namespace) (namespace)
```

### Workflow:
1. Create feature branches from `develop`
2. Merge PRs to `develop` → auto-deploys to `dev` namespace
3. Merge PRs to `main` → auto-deploys to `prod` namespace

## Kubernetes Namespace Mapping

| Branch | Environment | Namespace | Purpose |
|--------|-------------|-----------|---------|
| `main` | Production | `quickhaul-prod` | Live traffic |
| `develop` | Development | `quickhaul-dev` | Testing/Staging |

## Required Secrets

Each repository needs these GitHub Secrets:
- `KUBE_CONFIG` - Kubernetes cluster access
- `DOCKER_USERNAME` - Container registry username
- `DOCKER_PASSWORD` - Container registry password
