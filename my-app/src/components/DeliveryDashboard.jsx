import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './DeliveryDashboard.css';

const DeliveryDashboard = () => {
    const [user, setUser] = useState(null);
    const [deliveryPerson, setDeliveryPerson] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    // useRef to keep a stable reference to watchIds across re-renders
    const watchIds = useRef({});

    // Fetching logic can be kept in useCallback as it's used by the initialization effect
    const fetchDeliveryPersonData = useCallback(async (authUser) => {
        const { data: personData, error: personError } = await supabase
            .from('delivery_personnel').select('*').eq('user_id', authUser.id).single();
        if (personError) {
            setError('Could not find your delivery profile.');
            return null;
        }
        setDeliveryPerson(personData);
        return personData;
    }, []);

    const fetchAssignedOrders = useCallback(async (personId) => {
        const { data, error: fetchError } = await supabase
            .from('orders').select('*').eq('delivery_person_id', personId).order('created_at', { ascending: false });
        if (fetchError) {
            setError('Could not fetch assigned orders.');
        } else {
            setOrders(data);
        }
    }, []);

    // Effect for initializing user and fetching initial data
    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/delivery-login');
                return;
            }
            setUser(user);
            const person = await fetchDeliveryPersonData(user);
            if (person) {
                await fetchAssignedOrders(person.id);
            }
            setLoading(false);
        };
        initialize();
    }, [navigate, fetchDeliveryPersonData, fetchAssignedOrders]);

    // This is the main tracking effect. It runs ONLY when the `orders` array changes.
    useEffect(() => {
        // Helper function to stop tracking for a specific order
        const stopTracking = (orderId) => {
            const watchId = watchIds.current[orderId];
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                // Remove the id from our ref object
                delete watchIds.current[orderId];
                console.log(`[Order #${orderId}] Stopped tracking.`);
            }
        };

        // Helper function to start tracking for a specific order
        const startTracking = (orderId) => {
            if (!navigator.geolocation) return;
            // If already tracking, do nothing
            if (watchIds.current[orderId]) return;

            console.log(`[Order #${orderId}] Starting tracking...`);
            const watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const location = `POINT(${longitude} ${latitude})`;
                    
                    const { error: dbError } = await supabase
                        .from('orders').update({ delivery_person_location: location }).eq('id', orderId);
                    
                    if (dbError) {
                        console.error(`[Order #${orderId}] Error updating location:`, dbError);
                    } else {
                        console.log(`[Order #${orderId}] Location updated successfully.`);
                    }
                },
                (geoError) => {
                    console.error(`[Order #${orderId}] Geolocation error:`, geoError);
                    stopTracking(orderId); // Stop on error
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
            // Store the new watchId in our ref
            watchIds.current[orderId] = watchId;
        };

        // Loop through the current orders and decide whether to start or stop tracking
        orders.forEach(order => {
            if (order.status === 'out_for_delivery') {
                startTracking(order.id);
            } else {
                stopTracking(order.id);
            }
        });

        // The main cleanup function for this effect
        return () => {
            console.log("Cleaning up all active location watchers.");
            Object.values(watchIds.current).forEach(watchId => {
                navigator.geolocation.clearWatch(watchId);
            });
            watchIds.current = {};
        };
    }, [orders]); // The effect depends ONLY on the orders state

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        const { error: updateError } = await supabase
            .from('orders').update({ status: newStatus }).eq('id', orderId);
        if (updateError) {
            alert('Error updating status: ' + updateError.message);
        } else {
            // This state update will cause the tracking `useEffect` above to re-run
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/delivery-login'); // The useEffect cleanup will handle stopping trackers
    };

    if (loading) return <div className="dashboard-loading">Loading Dashboard...</div>;
    if (error) return <div className="dashboard-error">Error: {error}</div>;

    return (
        <div className="delivery-dashboard-container">
            <header className="dashboard-header">
                <h1>Delivery Dashboard</h1>
                <div className="user-info">
                    <span>Welcome, {deliveryPerson?.full_name || user?.email}</span>
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
            </header>
            <main className="dashboard-content">
                <h2>Your Assigned Orders</h2>
                {orders.length === 0 ? (
                    <div className="orders-list-placeholder"><p>You have no orders assigned.</p></div>
                ) : (
                    <div className="delivery-orders-grid">
                        {orders.map(order => (
                            <div key={order.id} className={`delivery-order-card status-${order.status}`}>
                                <div className="card-header">
                                    <h3>Order #{order.id}</h3>
                                    <span className={`status-tag status-${order.status}`}>{order.status.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="card-content">
                                    <p><strong>Customer:</strong> {order.name}</p>
                                    <p><strong>Address:</strong> {order.address}</p>
                                    <p><strong>Phone:</strong> {order.phone}</p>
                                </div>
                                <div className="card-actions">
                                    {order.status !== 'out_for_delivery' && (
                                        <button onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')} className="action-button pickup">Start Delivery</button>
                                    )}
                                    {order.status === 'out_for_delivery' && (
                                        <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} className="action-button deliver">Mark as Delivered</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DeliveryDashboard;