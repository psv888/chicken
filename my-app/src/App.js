import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Register from './components/Register';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import OrderTracking from './components/OrderTracking';
import { CartProvider } from './CartContext';
import './App.css';
import AdminOrderManagement from './components/AdminOrderManagement';
import DeliveryPersonnelLogin from './components/DeliveryPersonnelLogin';
import DeliveryDashboard from './components/DeliveryDashboard';

// Import the missing category page components
import RestaurantsPage from './components/RestaurantsPage';
import BiryaniPage from './components/BiryaniPage';
import TiffinsPage from './components/TiffinsPage';
import PicklesPage from './components/PicklesPage';
import ParentMenuPage from './components/ParentMenuPage';


function App() {
  return (
    <Router>
      <CartProvider>
        <div className="App">
          <Routes>
            {/* Existing Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin-home" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrderManagement />} />
            <Route path="/delivery-login" element={<DeliveryPersonnelLogin />} />
            <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
            <Route path="/order-tracking" element={<OrderTracking />} />

            {/* ADDED: Routes for the category pages */}
            <Route path="/restaurants" element={<RestaurantsPage />} />
            <Route path="/biryani" element={<BiryaniPage />} />
            <Route path="/tiffins" element={<TiffinsPage />} />
            <Route path="/pickles" element={<PicklesPage />} />
            <Route path="/parent-menu" element={<ParentMenuPage />} />
          </Routes>
        </div>
      </CartProvider>
    </Router>
  );
}

export default App;