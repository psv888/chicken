import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './OrderTracking.css';
// Import the Leaflet components
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// This section fixes the default icon path issue with Leaflet and Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const OrderTracking = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // This data fetching logic is now correct and does not need to change.
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`public:orders:id=eq.${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        async () => {
          if (order?.id) {
            const { data, error: rpcError } = await supabase
              .rpc('get_order_with_geojson_location', { order_id_param: order.id }).single();
            if (!rpcError && data) setOrder(data);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.id]);

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .rpc('get_order_with_geojson_location', { order_id_param: orderId.trim() }).single();
    if (fetchError || !data) {
      setError('Order not found. Please check the ID and try again.');
      setOrder(null);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };
  
  // Revert the parser to the format Leaflet needs: [latitude, longitude]
  const parseLocation = useCallback((locationGeoJSON) => {
    if (!locationGeoJSON || locationGeoJSON.type !== 'Point' || !locationGeoJSON.coordinates) return null;
    const [lon, lat] = locationGeoJSON.coordinates;
    return [lat, lon]; // Leaflet expects [lat, lon] array
  }, []);

  const deliveryLocation = useMemo(() => 
    parseLocation(order?.delivery_person_location),
    [order?.delivery_person_location, parseLocation]
  );
  
  const statusMap = {
    pending: { text: "Pending", progress: 10 },
    confirmed: { text: "Confirmed", progress: 25 },
    ready: { text: "Ready for Pickup", progress: 50 },
    out_for_delivery: { text: "Out for Delivery", progress: 75 },
    delivered: { text: "Delivered", progress: 100 },
    cancelled: { text: "Cancelled", progress: 0 },
  };

  const currentStatus = order ? (statusMap[order.status] || { text: "Unknown", progress: 0 }) : null;

  return (
    <div className="order-tracking-container">
      <div className="tracking-card">
        <button onClick={() => navigate('/home')} className="back-button">← Back to Home</button>
        <h1>Track Your Order</h1>
        <p>Enter your order ID below to see its status.</p>
        <form onSubmit={handleTrackOrder} className="tracking-form">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter your order ID"
            className="order-id-input"
          />
          <button type="submit" className="track-button" disabled={loading}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        {order && (
          <div className="order-status-container">
            <h2>Order Details #{order.id}</h2>
            <div className="status-timeline">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${currentStatus.progress}%` }}></div>
              </div>
              <p className="current-status-text">Status: <strong>{currentStatus.text}</strong></p>
            </div>
            
            {order.status === 'out_for_delivery' && deliveryLocation && (
              <div className="map-container">
                <h3>Live Delivery Map</h3>
                <MapContainer center={deliveryLocation} zoom={15} scrollWheelZoom={false} style={{ height: '400px', width: '100%' }}>
                  {/* This TileLayer uses the free OpenStreetMap data source */}
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={deliveryLocation}>
                    <Popup>The delivery is here!</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
            
            {order.status === 'out_for_delivery' && !deliveryLocation && (
                <div className="delivery-info-placeholder">
                    <p>Waiting for delivery person to start sharing their location...</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;