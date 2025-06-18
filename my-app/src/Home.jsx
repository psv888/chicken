import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const sections = [
    { key: 'restaurants', label: 'Restaurants', icon: '🍽️' },
    { key: 'biryani', label: 'Biryani Points', icon: '🍚' },
    { key: 'pickles', label: 'Pickles', icon: '🥒' },
    { key: 'tiffins', label: 'Tiffins', icon: '🥘' },
];

const carouselImages = [
    // Biryani
    'https://images.unsplash.com/photo-1600628422019-6c3d1b6c9a9e?auto=format&fit=crop&w=800&q=80',
    // Tiffins (Indian breakfast)
    'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=800&q=80',
    // Pickle
    'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=800&q=80',
    // Fried Rice
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    // Restaurant
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
];

// Mock dish previews for restaurants
const mockDishes = [
    {
        name: 'Paneer Butter Masala',
        photo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
    },
    {
        name: 'Chicken Biryani',
        photo_url: 'https://images.unsplash.com/photo-1600628422019-6c3d1b6c9a9e?auto=format&fit=crop&w=400&q=80',
    },
    {
        name: 'Masala Dosa',
        photo_url: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80',
    },
];

const Home = () => {
    const [current, setCurrent] = React.useState(0);
    const [items, setItems] = useState({
        restaurants: [],
        biryani: [],
        pickles: [],
        tiffins: [],
    });
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchItems = async () => {
            const { data, error } = await supabase
                .from('admin_items')
                .select('*');
            if (error) return;
            const grouped = { restaurants: [], biryani: [], pickles: [], tiffins: [] };
            data.forEach(item => {
                if (grouped[item.section]) grouped[item.section].push(item);
            });
            setItems(grouped);
        };
        fetchItems();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrent((prev) => (prev + 1) % carouselImages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const goToPrev = () => {
        setCurrent((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
    };

    const goToNext = () => {
        setCurrent((prev) => (prev + 1) % carouselImages.length);
    };

    return (
        <div className="home-container">
            <video className="bg-video" autoPlay loop muted playsInline>
                <source src="https://videos.pexels.com/video-files/6894472/6894472-hd_1920_1080_25fps.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            <header className="home-header">
                <button className="back-btn" onClick={() => navigate(-1)} title="Back">
                    <span className="material-icons">arrow_back</span>
                </button>
                <div className="search-container">
                    <div className="search-bar">
                        <span className="search-icon material-icons">search</span>
                        <input
                            type="text"
                            placeholder="Search for restaurants, cuisines or dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="carousel-container">
                <div className="carousel">
                    <button className="carousel-arrow left" onClick={goToPrev}>❮</button>
                    {carouselImages.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt="carousel"
                            className={idx === current ? 'active' : ''}
                            style={{ display: idx === current ? 'block' : 'none' }}
                        />
                    ))}
                    <button className="carousel-arrow right" onClick={goToNext}>❯</button>
                </div>
                <div className="carousel-dots">
                    {carouselImages.map((_, idx) => (
                        <span 
                            key={idx} 
                            className={`dot ${idx === current ? 'active' : ''}`}
                            onClick={() => setCurrent(idx)}
                        />
                    ))}
                </div>
            </div>

            <div className="quick-categories">
                {sections.map((section) => (
                    <div
                        key={section.key}
                        className="category-card clickable"
                        onClick={() => navigate(`/${section.key}`)}
                        tabIndex={0}
                        role="button"
                        aria-label={section.label}
                        onKeyDown={e => { if (e.key === 'Enter') navigate(`/${section.key}`); }}
                    >
                        <span className="category-icon">{section.icon}</span>
                        <span className="category-label">{section.label}</span>
                    </div>
                ))}
            </div>

            <div className="home-sections">
                {sections.map((s) => (
                    <div key={s.key} className="home-section">
                        <div className="section-header">
                            <h3>{s.label}</h3>
                            <button className="view-all-btn">View All</button>
                        </div>
                        <div className="home-section-items">
                            {items[s.key].length === 0 && (
                                <div className="no-items-message">
                                    <span className="no-items-icon">🍽️</span>
                                    <span>No items available yet.</span>
                                </div>
                            )}
                            {items[s.key].map((item, idx) => (
                                <div key={idx} className="item-card">
                                    <div className="item-image-container">
                                        <img src={item.photo_url} alt={item.name} className="item-image" />
                                        <div className="item-rating">
                                            <span>★</span>
                                            <span>4.2</span>
                                        </div>
                                    </div>
                                    <div className="item-details">
                                        <h4 className="item-name">{item.name}</h4>
                                        <p className="item-location">{item.location}</p>
                                        <div className="item-meta">
                                            <span className="item-price">₹{item.price}</span>
                                            <span className="item-delivery-time">30-35 min</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home; 