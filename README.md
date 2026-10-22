# ERP Management System: Enterprise RBAC & Cloud Business Portal

A full-stack, enterprise-grade Enterprise Resource Planning (ERP) platform designed for multi-tier inventory management, categorized B2C/B2B storefront ordering, procurement lifecycle tracking with Goods Receipt Notes (GRN), commercial invoicing, and granular Role-Based Access Control (RBAC).

---

## 🌐 Live Cloud Deployment

| Component | Platform | Status |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | 🟢 Live |
| **Backend API** | [Render](https://render.com) | 🟢 Live |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | 🟢 Live (Replica Set) |

---

## 🔑 Deployed Demo Accounts

All pre-configured accounts in the live MongoDB Atlas cluster use the default enterprise password:
> **Password**: `Welcome@123`

| Role | Email | Description & Scope |
| :--- | :--- | :--- |
| **System Admin** | `admin@erp.com` | Full enterprise control, system KPIs, user & staff provisioning, audit oversight |
| **Sales Manager** | `sales@erp.com` | Sales pipeline, order approval, shipping transitions, invoicing & payment tracking |
| **Purchase Manager** | `purchase@erp.com` | Supplier directory, purchase orders (PO), GRN intake approval, payment verification |
| **Inventory Manager** | `inventory@erp.com` | Stock valuation, reorder thresholds, warehouse intake & inventory movements |
| **Supplier** | `wholesale@kirana.com` | Multi-tenant PO contract portal, shipment dispatch & delivery confirmation, PDF invoices |
| **Customer** | `praveen@gmail.com` | Categorized shopping store, cart & checkout, order history, invoice downloads |

---

## 🚀 Key Features & Capabilities

### 1. Granular RBAC & Security Isolation
- **Role-Based Authorization**: Protected by JWT verification middleware and strict route-level role gates (`Admin`, `Sales_Manager`, `Purchase_Manager`, `Inventory_Manager`, `Customer`, `Supplier`).
- **Multi-Tenant Supplier Isolation**: Suppliers can only view and update purchase orders assigned to their business ID.
- **Customer Privacy**: Customers only access their own order histories, invoices, and cart sessions.
- **Secure Password Hashing**: Enforces standard `bcrypt` hashing with pre-save hooks and security rules.
- **Sidebar & Route Guarding**: Dynamic navigation tree adapted to the authenticated role with automatic route protection.

### 2. Modern Customer Storefront & Cart Experience
- **Categorized Shopping**: Browse items by category (*Grocery*, *Packaged Food*, *Dairy*, *Beverages*, *Household*).
- **Persistent Cart**: Cloud-persisted shopping cart with quantity controls, subtotal calculations, and stock checks.
- **Concurrency & Idempotency Protection**: Safe checkout protected by idempotency keys to prevent double-charging or duplicate order placement.

### 3. Inventory Reservation & Stock Tracking
- **Two-Phase Inventory Commitment**: When a sales order is placed, stock is *reserved*. When delivered, stock is physically decremented, preventing stockout races.
- **Automatic SKU Generation**: Standardized SKU codes based on category prefix, brand, and sequence.
- **Reorder Level Alerts**: Dynamic badges flagging critical low stock items across purchase and inventory views.
- **Stock Movements Audit**: Complete audit trail tracking inventory increases (GRN intake) and decreases (order delivery).

### 4. Procurement Workflow & Goods Receipt Notes (GRN)
- **Purchase Order (PO) Lifecycle**: `Draft` ➔ `Ordered` ➔ `Partially Received` ➔ `Received` ➔ `Completed`.
- **GRN Physical Intake**: Warehouse staff verify received quantities against PO line items.
- **Two-Way Payment Sync**: Marking a sales order as paid automatically synchronizes the associated invoice, and vice versa.

### 5. Universal Profile Management
- Universal Profile page (`/profile`) available for all roles to view and manage personal details, contact numbers, and delivery/billing addresses.
- Automatically synchronizes with customer directory profiles and linked contacts.

### 6. Document Generation
- Export professional, print-ready PDF invoices and Purchase Order documents directly in the browser via `jspdf` and `jspdf-autotable`.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express 5, MongoDB Atlas (Mongoose 9), JWT (`jsonwebtoken`), `bcryptjs`, `express-validator`.
- **Frontend**: React 19, Vite, Tailwind CSS, Material-UI Icons, Recharts, `jspdf`, React Router 7.
- **Deployment**: Render (Backend Web Service), Vercel (Frontend Client), MongoDB Atlas (Cloud Database).

---

## 🏁 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/praveenreddy1825/erp-management-system.git
cd erp-management-system
```

### 2. Backend Configuration
1. Navigate to `backend`:
   ```bash
   cd backend
   npm install
   ```
2. Configure `.env`:
   ```env
   PORT=9999
   MONGO_URI=mongodb://localhost:27017/erp_management
   JWT_SECRET=your_super_secret_jwt_key
   NODE_ENV=development
   ```
3. Seed sample data:
   ```bash
   npm run seed
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Configuration
1. Navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. To test production build:
   ```bash
   npm run build
   ```

---

## 📂 Project Directory Structure

```
ERP-MANAGEMENT-SYSTEM/
├── backend/
│   ├── config/             # Database connection (db.js)
│   ├── controllers/        # Auth, Products, Orders, Procurement, Invoices, Cart
│   ├── middleware/         # Auth token & role-checking middlewares
│   ├── models/             # Mongoose schemas (User, Product, SalesOrder, etc.)
│   ├── routes/             # Express API route endpoints
│   ├── scripts/            # Seeder and migration utilities
│   ├── tests/              # Integration and unit tests
│   └── utils/              # Inventory helpers, PDF generators, token helpers
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, Sidebar, Navbar, Role-based Dashboards
│   │   ├── context/        # AuthContext & CartContext
│   │   ├── pages/          # Products, SalesOrders, PurchaseOrders, Profile, etc.
│   │   └── utils/          # PO Invoice PDF generation
└── README.md
```

---

## 📄 License
This project is licensed under the ISC License.
