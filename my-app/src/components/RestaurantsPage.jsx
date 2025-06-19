import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ReactModal from 'react-modal';
import './RestaurantsPage.css';
import { useCart } from '../CartContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_51RbTpBGapGv2lLdZZYPUYMxOFi6DqmNMGjbquTXRHVl1NUVHN2VwQpESinh48gBTAlvWCSfpXeUINTUTHWL5INdd00MrvxF4qR');

function PaymentStep({ amount, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [prButtonError, setPrButtonError] = useState(null);

  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'IN', // Change to your country code if needed
        currency: 'inr',
        total: {
          label: 'Total',
          amount: Math.round(amount * 100), // Stripe expects amount in paise
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      pr.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(pr);
        } else {
          setPaymentRequest(null);
        }
      });
      pr.on('paymentmethod', async (ev) => {
        setLoading(true);
        try {
          // Create PaymentIntent on backend
          const res = await fetch('http://localhost:4242/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount }),
          });
          const { clientSecret } = await res.json();
          // Confirm the PaymentIntent
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );
          if (confirmError) {
            ev.complete('fail');
            setPrButtonError(confirmError.message);
            setLoading(false);
            return;
          }
          ev.complete('success');
          if (paymentIntent.status === 'requires_action') {
            const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
            if (actionError) {
              setPrButtonError(actionError.message);
              setLoading(false);
              return;
            }
          }
          setLoading(false);
          onPaymentSuccess();
        } catch (err) {
          setPrButtonError('Payment failed.');
          setLoading(false);
        }
      });
    }
  }, [stripe, amount, onPaymentSuccess]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    // 1. Create PaymentIntent on backend
    const res = await fetch('http://localhost:4242/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const { clientSecret } = await res.json();
    // 2. Confirm payment on frontend
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });
    setLoading(false);
    if (result.error) {
      alert(result.error.message);
    } else if (result.paymentIntent.status === 'succeeded') {
      onPaymentSuccess();
    }
  };

  return (
    <div>
      {paymentRequest && (
        <div style={{ marginBottom: 16 }}>
          <PaymentRequestButtonElement options={{ paymentRequest }} />
          {prButtonError && <div style={{ color: 'red', marginTop: 8 }}>{prButtonError}</div>}
          <div style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 4 }}>
            Or pay with card below
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{marginTop:8}}>
        <CardElement />
        <button type="submit" disabled={!stripe || loading} style={{width:'100%', background:'#ff4d5a', color:'#fff', border:'none', borderRadius:8, padding:'12px 0', fontWeight:600, fontSize:'1.08rem', cursor:'pointer', marginTop:12}}>
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [menuModalParent, setMenuModalParent] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [dishSearch, setDishSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const { cart, addToCart, removeFromCart, clearCart } = useCart();
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'form' | 'confirm'
  const [orderDetails, setOrderDetails] = useState({ name: '', phone: '', address: '' });
  const [orderId, setOrderId] = useState('');

  ReactModal.setAppElement('#root');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_items')
        .select('*')
        .eq('section', 'restaurants');
      setRestaurants(data || []);
      setLoading(false);
    };
    fetchData();
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
    // 1. Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        name: orderDetails.name,
        phone: orderDetails.phone,
        address: orderDetails.address,
        total_price: cartTotal,
      }])
      .select()
      .single();
    if (orderError) {
      alert('Order failed: ' + orderError.message);
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
      return;
    }
    setOrderId(order.id);
    clearCart();
    setCheckoutStep('confirm');
  }

  // Reset checkout step when opening/closing cart modal
  useEffect(() => {
    if (cartModalOpen) setCheckoutStep('cart');
  }, [cartModalOpen]);

  return (
    <div className="category-page-container">
      <div className="category-search-bar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="material-icons">search</span>
        <input
          type="text"
          placeholder="Search restaurants..."
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
          {restaurants
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
          </>
        )}
      </ReactModal>
      {/* Cart Modal */}
      <ReactModal
        isOpen={cartModalOpen}
        onRequestClose={() => setCartModalOpen(false)}
        className="admin-menu-modal"
        overlayClassName="admin-menu-modal-overlay"
        contentLabel="Cart Modal"
      >
        <button className="admin-menu-modal-close" onClick={() => setCartModalOpen(false)}>&times;</button>
        <h2 style={{textAlign:'center', marginBottom:12}}>Your Cart</h2>
        {checkoutStep === 'cart' && (
          cartItems.length === 0 ? (
            <div style={{color:'#888', textAlign:'center', fontSize:'1.1rem'}}>Your cart is empty.</div>
          ) : (
            <>
              <div style={{marginBottom:18}}>
                {cartItems.map((item, idx) => (
                  <div key={item.dish.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, borderBottom:'1px solid #f0f0f0', paddingBottom:6}}>
                    <span style={{fontWeight:500}}>{item.dish.name}</span>
                    <span style={{color:'#1a73e8', fontWeight:600}}>₹{item.dish.price}</span>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <button onClick={() => removeFromCart(item.dish)} disabled={!cart[item.dish.id]} style={{ padding: '2px 8px', fontSize: 18, borderRadius: 6, border: '1px solid #eee', background: '#fafbfc', cursor: cart[item.dish.id] ? 'pointer' : 'not-allowed', color: cart[item.dish.id] ? '#ff4d5a' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons">remove</span>
                      </button>
                      <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                      <button onClick={() => addToCart(item.dish)} style={{ padding: '2px 8px', fontSize: 18, borderRadius: 6, border: '1px solid #eee', background: '#fafbfc', cursor: 'pointer', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{fontWeight:600, fontSize:'1.1rem', textAlign:'right', marginBottom:18}}>Total: <span style={{color:'#ff4d5a'}}>₹{cartTotal}</span></div>
              <button onClick={() => setCheckoutStep('form')} style={{width:'100%', background:'#ff4d5a', color:'#fff', border:'none', borderRadius:8, padding:'12px 0', fontWeight:600, fontSize:'1.08rem', cursor:'pointer'}}>Checkout</button>
            </>
          )
        )}
        {checkoutStep === 'form' && (
          <form onSubmit={e => { e.preventDefault(); setCheckoutStep('payment'); }} style={{marginTop:8}}>
            <input
              type="text"
              placeholder="Name"
              value={orderDetails.name}
              onChange={e => setOrderDetails({ ...orderDetails, name: e.target.value })}
              required
              style={{width:'100%', marginBottom:10, padding:8, borderRadius:6, border:'1px solid #eee'}}
            />
            <input
              type="text"
              placeholder="Phone"
              value={orderDetails.phone}
              onChange={e => setOrderDetails({ ...orderDetails, phone: e.target.value })}
              required
              style={{width:'100%', marginBottom:10, padding:8, borderRadius:6, border:'1px solid #eee'}}
            />
            <textarea
              placeholder="Delivery Address"
              value={orderDetails.address}
              onChange={e => setOrderDetails({ ...orderDetails, address: e.target.value })}
              required
              style={{width:'100%', marginBottom:10, padding:8, borderRadius:6, border:'1px solid #eee', minHeight:60}}
            />
            <div style={{display:'flex', gap:10}}>
              <button type="submit" style={{flex:1, background:'#ff4d5a', color:'#fff', border:'none', borderRadius:8, padding:'12px 0', fontWeight:600, fontSize:'1.08rem', cursor:'pointer'}}>Next: Payment</button>
              <button type="button" onClick={() => setCheckoutStep('cart')} style={{flex:1, background:'#eee', color:'#444', border:'none', borderRadius:8, padding:'12px 0', fontWeight:600, fontSize:'1.08rem', cursor:'pointer'}}>Back</button>
            </div>
          </form>
        )}
        {checkoutStep === 'payment' && (
          <Elements stripe={stripePromise}>
            <PaymentStep amount={cartTotal} onPaymentSuccess={async () => {
              // Insert order and order_items in Supabase after payment
              const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                  name: orderDetails.name,
                  phone: orderDetails.phone,
                  address: orderDetails.address,
                  total_price: cartTotal,
                }])
                .select()
                .single();
              if (orderError) {
                alert('Order failed: ' + orderError.message);
                return;
              }
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
                return;
              }
              setOrderId(order.id);
              clearCart();
              setCheckoutStep('confirm');
            }} />
          </Elements>
        )}
        {checkoutStep === 'confirm' && (
          <div style={{textAlign:'center', marginTop:24}}>
            <h3 style={{color:'#1a7f37'}}>Order Confirmed!</h3>
            <p>Your order ID: <b>{orderId}</b></p>
            <p>Thank you for ordering, {orderDetails.name}!</p>
            <button onClick={() => { setCheckoutStep('cart'); setCartModalOpen(false); }} style={{marginTop:18, background:'#ff4d5a', color:'#fff', border:'none', borderRadius:8, padding:'10px 28px', fontWeight:600, fontSize:'1.08rem', cursor:'pointer'}}>Close</button>
          </div>
        )}
      </ReactModal>
    </div>
  );
} 