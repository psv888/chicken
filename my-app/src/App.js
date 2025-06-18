import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Home from './Home';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import RestaurantsPage from './components/RestaurantsPage';
import BiryaniPage from './components/BiryaniPage';
import PicklesPage from './components/PicklesPage';
import TiffinsPage from './components/TiffinsPage';
import ParentMenuPage from './components/ParentMenuPage';
import { CartProvider } from './CartContext';
import './App.css';

function App() {
  return (
    <CartProvider>
      <video className="bg-video" autoPlay loop muted playsInline>
        <source src="https://cdn.pixabay.com/video/2023/03/27/158011-814993095_large.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-home" element={<AdminDashboard />} />
            <Route path="/restaurants" element={<RestaurantsPage />} />
            <Route path="/biryani" element={<BiryaniPage />} />
            <Route path="/pickles" element={<PicklesPage />} />
            <Route path="/tiffins" element={<TiffinsPage />} />
            <Route path="/parent/:id" element={<ParentMenuPage />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
