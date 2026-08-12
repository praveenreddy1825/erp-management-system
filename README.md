# ERP Management System: Secure Role-Based Access Control (RBAC) & Business Portal

A modern, security-first ERP system designed to manage sales pipelines, procurement contracts, inventory stock tracking, goods receipt notes (GRN), and commercial invoicing. 

The application utilizes a stateless, token-based authentication framework to enforce a granular Role-Based Access Control (RBAC) permission matrix, isolating external clients (Customers/Suppliers) from proprietary business data, and dividing backend catalog/inventory write permissions across internal roles.

---

## 🚀 Key Features & Capabilities

### 1. Multi-Layered RBAC Security
* **Backend Authorization**: Core REST API routes are protected by a custom JWT-parsing middleware check coupled with route-level role filters (`Admin`, `Sales_Manager`, `Purchase_Manager`, `Inventory_Manager`, `Customer`, `Supplier`).
* **Database Isolation ("Own-Only" Filters)**: Queries are dynamically modified in the controllers to ensure external clients can only query their own profiles, orders, and invoices.
* **Write Permission Splits**: An `Inventory_Manager` can update physical quantities (`stock`, `reorderLevel`) but is blocked from modifying product details (e.g. price, description).
* **UI Conditionally Rendered Blocks**: Critical inventory alerts and stock numbers are completely hidden from customer and supplier viewports in the React catalog pages.

### 2. Specialized Dynamic Sub-Dashboards
The main dashboard dynamically loads one of six custom-built sub-dashboards depending on the user's role:
* **Admin Dashboard**: Core KPIs (total revenue, acquisition costs, low-stock count), sales-vs-procurement chart, stock level gauges, and operational task checklist.
* **Sales Dashboard**: Focuses on sales pipelines, pending client orders, active client counts, and invoice charts.
* **Purchase Dashboard**: Tracks vendor contracts, incoming shipments, and pending PO releases.
* **Inventory Dashboard**: Monitors warehouse stock levels, low-stock warnings, and processed Goods Receipt Notes.
* **Customer Dashboard**: Personalized billing portal with order logs, invoices, and direct helpdesk links.
* **Supplier Dashboard**: Viewport for suppliers to track assigned PO contracts and issue dispatch updates.

### 3. Business Workflow Automation
* **Zero-Setup User Provisioning**: When an Admin or Purchase Manager adds a Customer or Supplier to the directory, a linked user account is automatically generated in the database with a default password (`Welcome@123`), allowing them to log in instantly.
* **Self-Registration Linkages**: Public client registration initializes the customer profile, billing address, and contact links automatically.
* **Low Stock Highlight Alerts**: Dropdown selectors for PO creation prefix low-stock items with `⚠️ [LOW STOCK]` and display a red indicator next to line items if a low-stock product is selected.

---

## 🛠️ Tech Stack & Libraries

* **Backend**: Node.js, Express, MongoDB (with Mongoose ODM), JSON Web Tokens (JWT) for session management, and `bcrypt` for password hashing.
* **Frontend**: React (Vite), Tailwind CSS, Material-UI Icons, and Recharts (for data visualization).

---

## 📂 Database Relationship Schema
The database uses a decoupled **shared contact reference model** to link login credentials to business profiles:
- A `User` document holds authentication data (email, role, hashed password).
- A `Contact` document holds shipping/billing information (email, phone, address).
- A `Customer` or `Supplier` document references the `Contact` ID.
- During queries, the backend resolves: **Logged-in user email ➔ Contact ID ➔ Customer/Supplier Document ID**, ensuring data isolation.

---

## 🏁 Getting Started & Setup

### Prerequisites
- Node.js installed locally.
- MongoDB service running at `mongodb://localhost:27017`.

### 1. Backend Setup
1. Open a terminal in the `/backend` folder:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file with the following variables:
   ```env
   PORT=9999
   MONGO_URI=mongodb://localhost:27017/erp_management
   JWT_SECRET=your_confidential_jwt_secret_key
   NODE_ENV=development
   ```
3. Run the database seeder to initialize default catalogs, admin/staff users, and profiles:
   ```bash
   npm run seed
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a terminal in the `/frontend` folder:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🔑 Default Test Accounts
After seeding the database, you can log in with any of these pre-configured roles. 
* **Password (Shared Default)**: `Welcome@123`

| Role | Username (Email) | Purpose |
| :--- | :--- | :--- |
| **Admin** | `admin@erp.com` | Full operational system command |
| **Sales Manager** | `sales@erp.com` | Manage customers, process orders, issue invoices |
| **Purchase Manager** | `purchase@erp.com` | Create purchase orders, manage suppliers |
| **Inventory Manager** | `inventory@erp.com` | Update stock levels, register incoming GRN shipments |
| **Customer** | `praveen@gmail.com` | Client billing portal, place orders, download invoices |
| **Supplier** | `supplier_tata@gmail.com` | Supplier portal, accept PO contracts, update shipping status |
