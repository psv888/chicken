import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Make sure supabaseClient is imported
import './Register.css';

// Define the hardcoded admin email address
const ADMIN_EMAIL = 'satyavardhanpasupuleti@gmail.com'; // <-- CHANGE THIS TO YOUR ADMIN'S EMAIL

const AdminLogin = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Add loading state
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Perform a real Supabase login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        if (signInError) {
            setError(signInError.message || 'Invalid credentials');
        } else if (data.user) {
            // Check if the logged-in user is the designated admin
            if (data.user.email === ADMIN_EMAIL) {
                // Success: It's the admin, proceed to the dashboard
                navigate('/admin-home');
            } else {
                // It's a valid user, but not the admin. Deny access.
                setError('You do not have permission to access the admin panel.');
                // Immediately log them out.
                await supabase.auth.signOut();
            }
        } else {
            setError('An unknown error occurred during login.');
        }
        
        setLoading(false);
    };

    return (
        <div className="container">
            <form className="registration-form" onSubmit={handleSubmit}>
                <h2>Admin Login</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
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
                        disabled={loading}
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login as Admin'}
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;