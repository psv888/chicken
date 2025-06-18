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
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', formData.email)
            .maybeSingle();
        console.log('User data from Supabase:', data, error);
        if (error) {
            setError('An error occurred. Please try again.');
        } else if (!data) {
            setError('No user found with this email');
        } else if (data.password !== formData.password) {
            setError('Incorrect password');
        } else {
            navigate('/home');
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
                    <Link to="/admin-login">Login as Admin</Link>
                </div>
            </form>
        </div>
    );
};

export default Login; 