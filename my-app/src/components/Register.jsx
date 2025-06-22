import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Register.css';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        vehicleDetails: ''
    });
    const [isDelivery, setIsDelivery] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setIsDelivery(checked);
        } else {
            setFormData(prevState => ({
                ...prevState,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // Register with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
        });
        if (authError) {
            setError(authError.message || 'Registration failed.');
            return;
        }
        // Insert user profile into users table
        if (authData && authData.user) {
            const user = authData.user;
            const { error: profileError } = await supabase.from('users').insert([
                {
                    user_id: user.id, // use uuid from auth
                    email: formData.email,
                    name: formData.name,
                    phone: formData.phone,
                }
            ]);
            if (profileError) {
                setError('Profile creation failed: ' + profileError.message);
                return;
            }
            // If they are a delivery person, insert into 'delivery_personnel' table
            if (isDelivery) {
                const { error: deliveryError } = await supabase.from('delivery_personnel').insert([
                    {
                        user_id: user.id, // Foreign key from auth.users
                        full_name: formData.name,
                        phone_number: formData.phone,
                        vehicle_details: formData.vehicleDetails
                    }
                ]);
                if (deliveryError) {
                    setError('Delivery personnel registration failed: ' + deliveryError.message);
                    return;
                }
            }
            navigate('/login');
        } else {
            setError('Registration failed.');
        }
    };

    return (
        <div className="container">
            <form className="registration-form" onSubmit={handleSubmit}>
                <h2>Register</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="isDelivery"
                            checked={isDelivery}
                            onChange={handleChange}
                        />
                        Register as a Delivery Person
                    </label>
                </div>

                {isDelivery && (
                    <div className="form-group">
                        <label htmlFor="vehicleDetails">Vehicle Details</label>
                        <input
                            type="text"
                            id="vehicleDetails"
                            name="vehicleDetails"
                            value={formData.vehicleDetails}
                            onChange={handleChange}
                            placeholder="e.g., Honda Activa - AP01 AB 1234"
                            required
                        />
                    </div>
                )}

                <button type="submit">Register</button>
                <div className="form-link">
                    <Link to="/login">Already have an account? Login</Link>
                </div>
            </form>
        </div>
    );
};

export default Register; 