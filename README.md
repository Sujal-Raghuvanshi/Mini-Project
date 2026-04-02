# 🚀 SkyGate | Enterprise Multi-Tenant SaaS Platform

A high-performance, production-grade **Multi-Tenant SaaS architecture** built with Node.js, Express, and MongoDB. SkyGate provides ultimate data isolation, network-level security, and a robust billing tier system for scalable enterprise applications.

---

## 📁 Repository Structure

```text
/ (root)
├── server/                 # Full Backend Service (Git Tracked)
│   ├── src/
│   │   ├── middleware/     # tierGuard, ipGuard, rateLimiter, auth
│   │   ├── models/         # Tenant, Webhook, User, Project, Task
│   │   ├── routes/         # auth, api, admin, webhooks
│   │   ├── services/       # webhookService, tenantAwareService
│   │   └── utils/          # tenantContext, auditLogger
│   └── app.js              # Server entry point
├── client/                 # React Frontend (Local Management)
└── README.md               # You are here
```

---

## 🔐 Advanced Features

### 🏢 Multi-Tenancy & Strict Isolation
- **Context-Aware Routing**: Uses `TenantContext` to ensure one organization's data never leaks to another.
- **Dynamic Scoping**: Automatically scopes every database query to the authenticated `tenant_id`.

### 💳 Tiered Billing System (Phase 2)
- **Granular Resource Limits**: Enforces hard limits based on the organization's plan:
  - **Free**: 3 Projects, 5 Users, 10 Tasks.
  - **Premium**: 20 Projects, 25 Users, 200 Tasks.
  - **Enterprise**: **Unlimited** access to all resources.
- **Immediate Enforcement**: Includes Redis-backed cache-busting for real-time tier upgrades.

### 📡 Real-time Webhooks (Phase 3)
- **Event-Driven Integration**: Trigger external notifications for `project.created`, `task.completed`, and `tier.upgraded`.
- **HMAC Signing**: All signatures use `SHA-256` HMAC to verify payload integrity.
- **Auto-Disable**: Intelligent system that pauses webhook endpoints after 5 consecutive failures.

### 🛡️ Network-Level Security (Phase 3)
- **IP Allowlisting**: Organizations can restrict dashboard access to specific trusted IP addresses.
- **Superadmin Guard**: Dedicated "System" tenant with root access, immune to accidental IP lockouts.

---

## 🚀 Quick Start

### Installation
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install
```

### Environment Setup
Create a `.env` in the `server/` directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/sky_gate
PORT=3000
JWT_SECRET=your_jwt_secret_key
ADMIN_PASSWORD=admin123
SUPERADMIN_PASSWORD=super123
```

### Running the App
```bash
# Run both client and server concurrently (from root)
npm run dev
```

---

## 📡 API Reference

### Tenant API (Requires JWT)
- `GET /api/projects` - List organization projects
- `POST /api/webhooks` - Register a new integration endpoint
- `GET /api/rate-limit/status` - Check current tier & usage stats

### Admin API (Superadmin Only)
- `GET /admin/tenants` - Summary of all system organizations
- `PATCH /admin/tenants/:id/tier` - Upgrade/Downgrade an organization
- `POST /admin/tenants/:id/ip-allowlist` - Restrict organization access by IP

---

## 🧪 Testing

SkyGate includes a comprehensive security and isolation test suite:
```bash
# Run all backend tests
npm run test:server

# Run specific isolation tests
npm run test:isolation
```

---

## 📄 License
ISC  
**Last Updated**: April 2026