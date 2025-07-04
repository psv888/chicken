import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ReviewSection({ user, restaurantId, dishId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (restaurantId) query = query.eq('restaurant_id', restaurantId);
      if (dishId) query = query.eq('dish_id', dishId);
      const { data } = await query;
      setReviews(data || []);
    };
    fetchReviews();
  }, [restaurantId, dishId]);

  // Submit review
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('reviews').insert([{
      user_id: user.id || user.user_id, // support both id and user_id
      restaurant_id: restaurantId || null,
      dish_id: dishId || null,
      rating,
      comment,
    }]);
    setLoading(false);
    if (!error) {
      setComment('');
      setRating(5);
      // Refresh reviews
      let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (restaurantId) query = query.eq('restaurant_id', restaurantId);
      if (dishId) query = query.eq('dish_id', dishId);
      const { data } = await query;
      setReviews(data || []);
    } else {
      alert('Failed to submit review');
    }
  };

  return (
    <div style={{marginTop: 24}}>
      <h3>Reviews</h3>
      {user && (
        <form onSubmit={handleSubmit} style={{marginBottom: 16}}>
          <label>
            Rating:
            <select value={rating} onChange={e => setRating(Number(e.target.value))}>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ⭐</option>)}
            </select>
          </label>
          <br />
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Write your review..."
            required
            style={{width: '100%', minHeight: 40, marginTop: 8}}
          />
          <br />
          <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Review'}</button>
        </form>
      )}
      <div>
        {reviews.length === 0 && <div>No reviews yet.</div>}
        {reviews.map(r => (
          <div key={r.id} style={{borderBottom: '1px solid #eee', marginBottom: 8, paddingBottom: 8}}>
            <div><b>{r.rating} ⭐</b> {r.comment}</div>
            <div style={{fontSize: 12, color: '#888'}}>By {r.user_id} on {new Date(r.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 