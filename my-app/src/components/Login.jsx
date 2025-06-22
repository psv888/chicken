import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Register.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // Use Supabase Auth for login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });
        if (error) {
            setError(error.message || 'Login failed.');
        } else if (data && data.user) {
            navigate('/home');
        } else {
            setError('Login failed.');
        }
    };

    return (
        <div className="container">
            <form className="registration-form" onSubmit={handleSubmit}>
                <h2>Login</h2>
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
                <button type="submit">Login</button>
                <div className="form-link">
                    <Link to="/register">Don't have an account? Register</Link>
                    <br />
                    <Link to="/admin">Login as Admin</Link>
                    <br />
                    <Link to="/delivery-login">Login as Delivery Personnel</Link>
                </div>
            </form>
        </div>
    );
};

export default Login; 