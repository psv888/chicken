import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ReactModal from 'react-modal';
import './RestaurantsPage.css';
import { useCart } from '../CartContext';
import ReviewSection from './ReviewSection';

export default function BiryaniPage() {
  const [biryani, setBiryani] = useState([]);
  const [search, setSearch] = useState('');
  const [menuModalParent, setMenuModalParent] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [dishSearch, setDishSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const { cart, addToCart, removeFromCart, clearCart } = useCart();
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [orderDetails, setOrderDetails] = useState({ name: '', phone: '', address: '' });
  const [orderId, setOrderId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  ReactModal.setAppElement('#root');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_items')
        .select('*')
        .eq('section', 'biryani');
      setBiryani(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user || null);
    });
  }, []);

  const openMenuModal = async (parent) => {
    setMenuModalParent(parent);
    setDishSearch('');
    const { data } = await supabase.from('dishes').select('*').eq('parent_id', parent.id);
    setDishes(data || []);
  };

  // Cart summary helpers
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);

  async function handleOrderSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      alert('You must be logged in to place an order.');
      setPlacingOrder(false);
      return;
    }

    // 1. Insert order with the correct user_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
          name: orderDetails.name || 'Test User',
          phone: orderDetails.phone || '0000000000',
          address: orderDetails.address || 'Test Address',
          total_price: cartTotal,
          status: 'pending',
          user_id: currentUser.id, // This is the correct column name and value
      }])
      .select()
      .single();

    if (orderError) {
      alert('Order failed: ' + orderError.message);
      setPlacingOrder(false);
      return;
    }
    // 2. Insert order_items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      dish_id: item.dish.id,
      quantity: item.quantity,
      price_at_order: item.dish.price,
    }));
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    if (itemsError) {
      alert('Order items failed: ' + itemsError.message);
      setPlacingOrder(false);
      return;
    }
    setOrderId(order.id);
    clearCart();
    setCheckoutStep('confirm');
    setPlacingOrder(false);
  }

  useEffect(() => {
    if (cartModalOpen) setCheckoutStep('cart');
  }, [cartModalOpen]);

  return (
    <div className="category-page-container">
      <div className="category-search-bar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="material-icons">search</span>
        <input
          type="text"
          placeholder="Search biryani points..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ marginLeft: 'auto', cursor: 'pointer', position: 'relative' }} onClick={() => setCartModalOpen(true)}>
          <span className="material-icons" style={{ fontSize: 28, color: '#ff4d5a' }}>shopping_cart</span>
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -8, background: '#ff4d5a', color: '#fff', borderRadius: '50%', fontSize: 13, padding: '2px 6px', fontWeight: 600 }}>{cartCount}</span>
          )}
        </span>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="category-cards-grid">
          {biryani
            .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
            .map((r, idx) => (
              <div className="category-card-preview" key={idx}>
                <img src={r.photo_url} alt={r.name} />
                <span>{r.name}</span>
                <span style={{color:'#666', fontSize:'0.98rem'}}>{r.location}</span>
                <span
                  className="menu-icon-btn"
                  title="View Menu"
                  onClick={() => openMenuModal(r)}
                  style={{marginTop:8, cursor:'pointer'}}
                >
                  <img src="https://cdn-icons-png.flaticon.com/512/3595/3595455.png" alt="Menu" style={{width:28, height:28}} />
                </span>
              </div>
            ))}
        </div>
      )}
      <ReactModal
        isOpen={!!menuModalParent}
        onRequestClose={() => setMenuModalParent(null)}
        className="admin-menu-modal"
        overlayClassName="admin-menu-modal-overlay"
        contentLabel="Menu Modal"
      >
        <button className="admin-menu-modal-close" onClick={() => setMenuModalParent(null)}>&times;</button>
        {menuModalParent && (
          <>
            <h2 style={{textAlign: 'center', marginBottom: 12}}>{menuModalParent.name} Menu</h2>
            <div style={{textAlign: 'center', color: '#888', marginBottom: 18}}>{menuModalParent.location}</div>
            <input
              className="admin-dish-search"
              type="text"
              placeholder="Search dishes..."
              value={dishSearch}
              onChange={e => setDishSearch(e.target.value)}
              style={{marginBottom: 10, marginTop: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid #eee', width: '90%'}}
            />
            <div className="admin-dashboard-dishes-cards">
              {dishes
                .filter(dish =>
                  !dishSearch || dish.name.toLowerCase().includes(dishSearch.toLowerCase())
                )
                .map((dish, dIdx) => (
                  <div key={dIdx} className="admin-dashboard-dish-card">
                    <img src={dish.photo_url} alt={dish.name} className="admin-dashboard-dish-img" />
                    <div className="admin-dashboard-dish-name">{dish.name}</div>
                    <div className="admin-dashboard-dish-price">₹{dish.price}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <button onClick={() => removeFromCart(dish)} disabled={!cart[dish.id]} style={{ padding: '2px 10px', fontSize: 20, borderRadius: 6, border: '1px solid #eee', background: '#fafbfc', cursor: cart[dish.id] ? 'pointer' : 'not-allowed', color: cart[dish.id] ? '#ff4d5a' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons">remove</span>
                      </button>
                      <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{cart[dish.id]?.quantity || 0}</span>
                      <button onClick={() => addToCart(dish)} style={{ padding: '2px 10px', fontSize: 20, borderRadius: 6, border: '1px solid #eee', background: '#fafbfc', cursor: 'pointer', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons">add</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <ReviewSection user={currentUser} restaurantId={menuModalParent.id} />
          </>
        )}
      </ReactModal>
      {/* Cart Modal */}
      <ReactModal
        isOpen={cartModalOpen}
        onRequestClose={() => setCartModalOpen(false)}
        className="cart-modal"
        overlayClassName="cart-modal-overlay"
      >
        <button className="cart-modal-close" onClick={() => setCartModalOpen(false)}>&times;</button>
        <h2 style={{textAlign:'center', marginBottom:12}}>Your Cart</h2>
        {checkoutStep === 'cart' && (
          cartItems.length === 0 ? (
            <div className="empty-cart-message">Your cart is empty.</div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.dish.id} className="cart-item">
                    <img src={item.dish.photo_url} alt={item.dish.name} />
                    <div className="cart-item-details">
                      <span>{item.dish.name}</span>
                      <span className="cart-item-price">₹{item.dish.price}</span>
                    </div>
                    <div className="cart-item-controls">
                      <button onClick={() => removeFromCart(item.dish)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => addToCart(item.dish)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <span>Total:</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={handleOrderSubmit} className="checkout-btn">Checkout (Test)</button>
            </>
          )
        )}
        {checkoutStep === 'form' && (
          <form onSubmit={handleOrderSubmit} className="checkout-form">
            <h3>Delivery Details</h3>
            <input
              type="text"
              placeholder="Name"
              value={orderDetails.name}
              onChange={e => setOrderDetails({ ...orderDetails, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Phone"
              value={orderDetails.phone}
              onChange={e => setOrderDetails({ ...orderDetails, phone: e.target.value })}
              required
            />
            <textarea
              placeholder="Delivery Address"
              value={orderDetails.address}
              onChange={e => setOrderDetails({ ...orderDetails, address: e.target.value })}
              required
            />
            <div className="form-actions">
                <button type="button" onClick={() => setCheckoutStep('cart')} className="back-btn">Back to Cart</button>
                <button type="submit" className="submit-btn">Submit Order</button>
            </div>
          </form>
        )}
        {checkoutStep === 'confirm' && (
          <div className="confirmation-step">
            <h3>Order Confirmed!</h3>
            <p>Your Order ID is <strong>{orderId}</strong>.</p>
            <p>Thank you for your purchase!</p>
            <button onClick={() => { setCheckoutStep('cart'); setCartModalOpen(false); }} className="close-btn">Close</button>
          </div>
        )}
      </ReactModal>
    </div>
  );
} 