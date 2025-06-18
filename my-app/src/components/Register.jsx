import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Register.css';

const Register = () => {
    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        password: '',
        phone: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        // Insert user data into Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    fullname: formData.fullname,
                    email: formData.email,
                    password: formData.password, // For demo only! Hash in production.
                    phone: formData.phone
                }
            ]);
        if (error) {
            setError(error.message);
        } else {
            setMessage('Registration successful!');
            setFormData({ fullname: '', email: '', password: '', phone: '' });
        }
    };

    return (
        <div className="container">
            <form className="registration-form" onSubmit={handleSubmit}>
                <h2>Registration Form</h2>
                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <label htmlFor="fullname">Full Name</label>
                    <input
                        type="text"
                        id="fullname"
                        name="fullname"
                        value={formData.fullname}
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
                    <label htmlFor="phone">Phone Number</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit">Register</button>
                <div className="form-link">
                    <Link to="/login">Already have an account? Login</Link>
                </div>
            </form>
        </div>
    );
};

export default Register; 