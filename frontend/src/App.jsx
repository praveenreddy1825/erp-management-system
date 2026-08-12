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
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path='sales-orders' element={<SalesOrders />}/>
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="grns" element={<GRNs />} />
          <Route path='invoices' element={<Invoices/>}/>
          <Route path="users" element={<Users />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
