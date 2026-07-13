import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // use your dashboard CSS for consistency
import axios from "axios";

// Truck icon for the map
const truckIcon = L.icon({
  iconUrl: 'https://www.citypng.com/public/uploads/preview/delivery-freight-black-truck-icon-download-png-701751695035832ecrif00wda.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});
const homeIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

// Auto-follow map component
function MapAutoFollow({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);
  return null;
}

export default function GPSModule() {
 const [destination, setDestination] = useState(null);
  const speedKmph = 40;
  const tankerRef = useRef({ lat: 33.6844, lng: 73.0479 });
  const targetRef = useRef(tankerRef.current);
  const [, forceUpdate] = useState(0);
  const [eta, setEta] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [showRating,setShowRating]=useState(false);

const [rating,setRating]=useState(5);
const [currentOrder, setCurrentOrder] = useState(null);

const [review,setReview]=useState("");

  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    setUserEmail(currentUser?.email || '');
  }, []);


  // =========================
// PROVIDER LIVE GPS SENDING
// =========================

// =========================
// 🚚 TANKER LIVE GPS MODE
// =========================







useEffect(() => {

  const loadDestination = async () => {

    try {

      const res = await fetch(
        `http://localhost:5000/api/customer/orders/${user._id}`
      );

      const orders = await res.json();


      const acceptedOrder = orders.find(
        order => order.status === "accepted"
      );


      if (!acceptedOrder) {
        setDestination(null);
        return;
      }
        setCurrentOrder(acceptedOrder);

      setDestination({
        lat: acceptedOrder.location.latitude,
        lng: acceptedOrder.location.longitude
      });


    } catch(err){
      console.log(err);
    }

  };


  if(user?._id){
    loadDestination();
  }


  const interval = setInterval(
    loadDestination,
    5000
  );


  return () => clearInterval(interval);


}, [user?._id]);
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();
    navigate('/login');
  };

  // Haversine distance
  const distanceKm = (a, b) => {

  if (!a || !b) return 0;

  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return 0;
  }


  const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  // Fetch tanker target from backend every 5s
  useEffect(() => {
   const fetchTarget = async () => {

    if (!destination) return;

    const res = await fetch(
        'http://localhost:5000/api/tanker-location'
    );

    const data = await res.json();

    targetRef.current = data.location;

    setLastUpdated(
        new Date().toLocaleTimeString()
    );

};

    fetchTarget();
    const interval = setInterval(fetchTarget, 5000);
    return () => clearInterval(interval);
  }, [destination]);

  // Animate tanker movement
  useEffect(() => {
    let animationFrame;
    let arrivedAlertShown = false;

    const animate = () => {

  // wait until destination and tanker location exist
  if (!destination || !targetRef.current) {
    animationFrame = requestAnimationFrame(animate);
    return;
  }


  const cur = tankerRef.current;
  const target = targetRef.current;

      const latDiff = target.lat - cur.lat;
      const lngDiff = target.lng - cur.lng;

      if (Math.abs(latDiff) > 0.00001 || Math.abs(lngDiff) > 0.00001) {
        tankerRef.current = {
          lat: cur.lat + latDiff * 0.03,
          lng: cur.lng + lngDiff * 0.03,
        };
      } else {
        tankerRef.current = target;
      }

      // Update ETA
      const dist = distanceKm(tankerRef.current, destination);
      const etaMinutes = Math.max(Math.round((dist / speedKmph) * 60), 0);
      setEta(etaMinutes);

      // Arrival alert only once
      if (dist < 0.02 && !arrivedAlertShown) {
        setArrived(true);
        arrivedAlertShown = true;
        setShowRating(true);
      }

      forceUpdate(prev => prev + 1);
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [destination]);

if (!destination) {
  return (
    <div className="dashboard-page">
      <h2 style={{ textAlign: 'center', marginTop: '40px' }}>
        Loading delivery location...
      </h2>
    </div>
  );
}

  const remainingDistance = distanceKm(
  tankerRef.current,
  destination
).toFixed(2);

const progress = Math.max(
  0,
  Math.min(100, 100 - remainingDistance * 10)
);



const submitRating = async () => {

  try {

    await axios.post(
      "http://localhost:5000/api/rating/submit",
      {
        orderId: currentOrder._id,
        providerId: currentOrder.providerId,
        customerId: currentOrder.customerId,
        rating,
        review
      }
    );

    alert("Thank you for your feedback!");

  } catch (err) {

    alert(err.response?.data?.message);

  }

};

  return (
    <div className="dashboard-page">
      {/* === Header === */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>
            SmartTanker&nbsp;<i className="fa-solid fa-truck moving-icon"></i>
          </h1>
          {userEmail && <p className="user-email">{userEmail}</p>}
        </div>
        <div className="header-right">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </header>

      {/* === Page Content === */}
  <div className="dashboard-container">

  <h1 className="dashboard-title">
    🚚 Smart Tanker Live Tracking
  </h1>

  {/* STATUS CARDS */}
  <div className="dashboard-cards">

    <div className="dashboard-card">
      <h3>🚚 Delivery Status</h3>
      <p
        style={{
          color: arrived ? 'green' : '#007bff',
          fontWeight: 'bold',
          fontSize: '18px'
        }}
      >
        {arrived ? 'Arrived' : 'En Route'}
      </p>
    </div>

    <div className="dashboard-card">
      <h3>⏱ ETA</h3>
      <p>
        {arrived
          ? 'Delivered'
          : eta !== null
          ? `${eta} min`
          : 'Calculating...'}
      </p>
    </div>

    <div className="dashboard-card">
      <h3>📍 Remaining Distance</h3>
      <p>{remainingDistance} km</p>
    </div>

    <div className="dashboard-card">
<h3>🛰 GPS Status</h3>

<p className="status-online">

{
 targetRef.current
 ? "Tanker GPS Connected ✅"
 : "Waiting for tanker GPS..."
}

</p>

</div>

  </div>

  {/* PROGRESS */}
  <div className="dashboard-card">
    <h3>📦 Delivery Progress</h3>

    <div
      style={{
        width: '100%',
        background: '#eee',
        borderRadius: '10px',
        overflow: 'hidden',
        height: '20px'
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: '#28a745',
          transition: '0.5s'
        }}
      />
    </div>

    <p style={{ marginTop: '10px' }}>
      {Math.round(progress)}% Complete
    </p>
  </div>

  {/* MAP */}
  <div className="dashboard-card1 map-card">
    <MapContainer
      center={tankerRef.current}
      zoom={14}
      className="leaflet-container"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      <Marker
        position={tankerRef.current}
        icon={truckIcon}
      >
        <Popup>
          🚚 SmartTanker Vehicle
        </Popup>
      </Marker>
      <Marker position={destination} icon={homeIcon}>
  <Popup>
    🏠 Your Delivery Location
  </Popup>
</Marker>

      <Polyline
        positions={[
          tankerRef.current,
          destination
        ]}
        color="blue"
      />

      <MapAutoFollow
        position={tankerRef.current}
      />
    </MapContainer>
  </div>

 <div className="tracking-grid">

  {/* ================= LIVE TRACKING ================= */}

  <div className="dashboard-card modern-card fade-in">

    <div className="card-title">
      <span>📍</span>
      <h3>Live Tracking</h3>
    </div>

    <div className="info-row">
      <span>🚚 Speed</span>
      <strong>~40 km/h</strong>
    </div>

    <div className="info-row">
      <span>📡 Update Interval</span>
      <strong>Every 5 sec</strong>
    </div>

    <div className="info-row">
      <span>🛰 GPS Status</span>
      <strong className="online">Connected</strong>
    </div>

    <div className="info-row">
      <span>📍 Latitude</span>
      <strong>{tankerRef.current.lat.toFixed(5)}</strong>
    </div>

    <div className="info-row">
      <span>📍 Longitude</span>
      <strong>{tankerRef.current.lng.toFixed(5)}</strong>
    </div>

    <div className="info-row">
      <span>🕒 Last Update</span>
      <strong>{lastUpdated || "Loading..."}</strong>
    </div>

  </div>

  {/* ================= DELIVERY STATUS ================= */}

  <div className="dashboard-card modern-card fade-in">

    <div className="card-title">
      <span>🛡️</span>
      <h3>Delivery Assurance</h3>
    </div>

    <div className="status-item success">
      ✔ Real-time GPS Tracking
    </div>

    <div className="status-item success">
      ✔ Live ETA Calculation
    </div>

    <div className="status-item success">
      ✔ Secure Cloud Monitoring
    </div>

    <div className="status-item success">
      ✔ Automatic Arrival Detection
    </div>

    <div className="status-item success">
      ✔ Continuous Location Updates
    </div>

  </div>

</div>



{arrived && (

<div className="dashboard-card rating-card fade-in">

<h2>⭐ Rate Your Delivery Experience</h2>

<p className="rating-subtitle">
Your feedback helps us improve our service.
</p>

<div className="star-rating">

{[1,2,3,4,5].map((star)=>(

<span

key={star}

className={star <= rating ? "star active" : "star"}

onClick={()=>setRating(star)}

>

★

</span>

))}

</div>

<p className="rating-text">

{

rating===5
? "Excellent Service 🚚"

: rating===4
? "Very Good 👍"

: rating===3
? "Average 🙂"

: rating===2
? "Needs Improvement 😕"

: "Poor 😞"

}

</p>

<textarea

className="review-box"

rows="5"

placeholder="Tell us about your experience..."

value={review}

onChange={(e)=>setReview(e.target.value)}

/>

<button

className="submit-review-btn"

onClick={submitRating}

>

⭐ Submit Review

</button>

</div>

)}

  {/* ACTIONS */}
  <div
    className="dashboard-card quick-action"
    style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '15px'
    }}
  >
    <button
      className="book-btn"
      onClick={() => navigate('/dashboard')}
    >
      ⬅ Back to Dashboard
    </button>
  </div>

</div>

    </div>
  );
}
