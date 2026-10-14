import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Register from './pages/Register.jsx';
import Products from './pages/Products.jsx'; 
import Customers from './pages/Customers.jsx'; 
import Suppliers from './pages/Suppliers.jsx';
import SalesOrders from './pages/SalesOrders.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import GRNs from './pages/GRNs.jsx';
import Invoices from './pages/Invoices.jsx'
import Users from './pages/Users.jsx';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext.jsx';

const LandingRedirect = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Supplier') return <Navigate to="/purchase-orders" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Protected Parent Route with Layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Nested Child Routes render inside the <Outlet /> of Layout */}
          <Route index element={<LandingRedirect />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="products"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer']}>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer']}>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="suppliers"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager']}>
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route
            path="sales-orders"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager']}>
                <SalesOrders />
              </ProtectedRoute>
            }
          />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route
            path="grns"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager']}>
                <GRNs />
              </ProtectedRoute>
            }
          />
          <Route
            path="invoices"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager']}>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
