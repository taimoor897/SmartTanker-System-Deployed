
import {
MapContainer,
TileLayer,
Marker,
Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import React, { useEffect, useState } from 'react';



import axios from 'axios';
import './Dashboard.css';


export default function TankerProviderDashboard() {

const [orders,setOrders] = useState([]);
const [activity,setActivity] = useState([]);
const [gpsStatus,setGpsStatus] = useState("Waiting for GPS...");
const [myLocation,setMyLocation] = useState(null);
const [isAvailable, setIsAvailable] = useState(true);

const API =
  process.env.REACT_APP_BACKEND || "http://localhost:5000";

const storedUser = localStorage.getItem("user");
const user = storedUser ? JSON.parse(storedUser) : null;

const [providerRating, setProviderRating] = useState({
  average: 0,
  totalReviews: 0
});


// =========================
// FETCH ORDERS
// =========================

const fetchOrders = async()=>{

try{

if(!user?._id){
console.log("No logged user");
return;
}


const res = await axios.get(
`${API}/api/provider/orders/${user._id}`
);


console.log(
"SERVER ORDERS:",
res.data
);


let sortedOrders = res.data;

if (myLocation) {

  sortedOrders = [...res.data].sort((a, b) => {

    const d1 = parseFloat(
      calculateDistance(
        myLocation.lat,
        myLocation.lng,
        a.location.latitude,
        a.location.longitude
      )
    );

    const d2 = parseFloat(
      calculateDistance(
        myLocation.lat,
        myLocation.lng,
        b.location.latitude,
        b.location.longitude
      )
    );

    return d1 - d2;
  });

}

setOrders(sortedOrders);

const provider = await axios.get(
`${API}/api/user/${user._id}`
);

setIsAvailable(provider.data.isAvailable);


setActivity(
res.data.slice(0,5).map((order,index)=>({

id:index,

text:
order.status==="accepted"
?
"🟡 Order accepted"
:
order.status==="delivered"
?
"🚚 Order delivered"
:
"🟢 New order received"

}))
);


}

catch(error){

console.log(
"FETCH ORDER ERROR:",
error.response?.data || error.message
);

}

};

const fetchRating = async () => {

  try {

    const res = await axios.get(
      `${API}/api/rating/provider/${user._id}`
    );

    setProviderRating(res.data);

  } catch (err) {

    console.log(err);

  }

};



// =========================
// ORDER LOADER
// =========================

useEffect(()=>{

fetchOrders();
  fetchRating();


const interval=setInterval(()=>{

fetchOrders();
 fetchRating();

},5000);



return()=>clearInterval(interval);


},[]);

useEffect(() => {
  if (myLocation) {
    fetchOrders();
  }
}, [myLocation]);




// =========================
// GPS TRACKING
// =========================

useEffect(()=>{


if(!user?._id){
return;
}


if(!navigator.geolocation){

setGpsStatus("GPS not supported ❌");

return;

}



const watchId =
navigator.geolocation.watchPosition(

async(position)=>{

const latitude = position.coords.latitude;
const longitude = position.coords.longitude;

// ⭐ ADD THIS HERE
setMyLocation({
  lat: latitude,
  lng: longitude
});

setGpsStatus("GPS Connected ✅");

try{

await axios.post(
`${API}/api/tanker/update-location`,
{
  latitude,
  longitude
});

console.log("GPS SENT", latitude, longitude);

}catch(error){

console.log("GPS SEND ERROR", error);

}

},







(error)=>{

console.log(error);

setGpsStatus(
"GPS Permission Denied ❌"
);

},



{
enableHighAccuracy:true,
timeout:10000,
maximumAge:0
}



);



return()=>{

navigator.geolocation.clearWatch(watchId);

};



},[user?._id]);





// =========================
// UPDATE STATUS
// =========================

const updateStatus = async(orderId,status)=>{


try{


await axios.put(
`${API}/api/order/update-status`,
{

orderId,

status,

providerId:user._id

}
);


fetchOrders();


}

catch(error){

console.log(
"STATUS ERROR",
error.response?.data || error.message
);

}


};




// =========================
// OPEN MAP
// =========================

const openMap=(location)=>{


if(
!location ||
location.latitude===undefined ||
location.longitude===undefined
){

alert(
"Customer location unavailable"
);

return;

}



window.open(

`https://www.google.com/maps?q=${location.latitude},${location.longitude}`,

"_blank"

);


};


// =========================
// START NAVIGATION
// =========================
const startNavigation = (location) => {

  if (!myLocation) {
    alert("Current location not available.");
    return;
  }

  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${myLocation.lat},${myLocation.lng}` +
    `&destination=${location.latitude},${location.longitude}` +
    `&travelmode=driving`;

  window.open(url, "_blank");
};


// =========================
// CALCULATE DISTANCE
// =========================
const calculateDistance = (lat1, lon1, lat2, lon2) => {

  const R = 6371; // Earth radius in KM

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return (R * c).toFixed(2);
};


useEffect(() => {

  const loadAvailability = async () => {

    try {

      const res = await axios.get(
        `${API}/api/provider/availability/${user._id}`
      );

      setIsAvailable(res.data.isAvailable);

    } catch (err) {

      console.log(err);

    }

  };

  if (user?._id) {
    loadAvailability();
  }

}, [user]);





if(!user){

return (

<div style={{padding:"20px"}}>

<h2>Please login first</h2>

</div>

);

}




return (

<div className="dashboard-page fade-in">


<header className="dashboard-header">

<div className="header-left">

<h1>
SmartTanker 🚚
</h1>

<p className="user-email">
Provider Control Center
</p>

</div>



<div className="header-right">

<span className="status-badge">
🟢 Live
</span>

</div>


</header>





<div className="dashboard-container">


<h1 className="dashboard-title">
🚚 Provider Dashboard
</h1>

<div className="dashboard-card">

<h2>🗺 Live Orders Map</h2>

<MapContainer

center={
myLocation
? [myLocation.lat,myLocation.lng]
: [33.6844,73.0479]
}

zoom={13}

style={{
height:"400px",
width:"100%",
borderRadius:"15px"
}}

>

<TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

{/* Tanker */}

{
myLocation && (

<Marker
position={[
myLocation.lat,
myLocation.lng
]}
>

<Popup>

🚚 Your Tanker

</Popup>

</Marker>

)
}

{/* Customers */}

{
orders.map(order=>(

<Marker

key={order._id}

position={[
order.location.latitude,
order.location.longitude
]}

>

<Popup>

<b>Customer</b>

<br/>

💧 {order.waterQuantity} Tank

<br/>

📍 {order.location.address}

</Popup>

</Marker>

))
}

</MapContainer>

</div>

<div className="dashboard-card">

  <h3>⭐ Driver Rating</h3>

  <p
    style={{
      fontSize: "28px",
      fontWeight: "bold",
      color: "#f5b301"
    }}
  >
    ⭐ {providerRating.average}
  </p>

  <small>
    {providerRating.totalReviews} Reviews
  </small>

</div>



<div className="dashboard-cards">


<div className="dashboard-card">

<h3>
📦 Total Orders
</h3>

<p>
{orders.length}
</p>

</div>




<div className="dashboard-card">

<h3>
🛰 GPS Status
</h3>

<p>
{gpsStatus}
</p>

</div>



</div>





<div className="dashboard-card activity-card fade-in">

  <div className="activity-header">

    <h3>🔔 Live Activity</h3>

    <span className="activity-count">
      {activity.length} Updates
    </span>

  </div>

  {activity.length === 0 ? (

    <div className="empty-activity">

      <div className="empty-icon">📭</div>

      <p>No recent activity</p>

      <small>New order updates will appear here.</small>

    </div>

  ) : (

    <div className="activity-feed">

      {activity.map(item => (

        <div
          key={item.id}
          className="activity-item"
        >

          <div className="activity-icon">
            🔔
          </div>

          <div className="activity-content">

            <p>{item.text}</p>

            <span>Just now</span>

          </div>

        </div>

      ))}

    </div>

  )}

</div>







<div className="dashboard-history">

<h2>
📦 Incoming Orders
</h2>



{
orders.length===0 ?

<p className="empty-text">
No orders available
</p>


:

<ul className="booking-list">


{

orders.map(order=>(


<li 
key={order._id}
className="booking-item"
>


<div>


<p
onClick={()=>openMap(order.location)}
style={{
cursor:"pointer",
color:"#007bff"
}}
>

📍 {order.location?.address || "Customer Location"}
<p className="order-row">
🕒 <strong>Time:</strong> {order.time}
</p>

</p>



<p>
💧 Quantity: {order.waterQuantity}
</p>
<div className="phone-card">

  <span>
    📞 {order.phoneNumber}
  </span>

  <a
    href={`https://wa.me/92${order.phoneNumber.replace(/^0/, "")}`}
    target="_blank"
    rel="noopener noreferrer"
    className="whatsapp-btn"
  >
    WhatsApp
  </a>

</div>
{myLocation && (
  <p style={{ color: "#0d6efd", fontWeight: "600" }}>
    📍 Distance:{" "}
    {calculateDistance(
      myLocation.lat,
      myLocation.lng,
      order.location.latitude,
      order.location.longitude
    )} km
  </p>
)}


</div>




<span className={`order-status ${order.status}`}>

{order.status}

</span>




<button

className="book-btn"

onClick={()=>updateStatus(
order._id,
"accepted"
)}

>

Accept

</button>
<button
  className="book-btn"
  style={{ background: "#0d6efd" }}
  onClick={() => startNavigation(order.location)}
>
  🧭 Navigate
</button>




<button

className="book-btn"

onClick={()=>updateStatus(
order._id,
"delivered"
)}

>

Done

</button>

<button
  className="book-btn"
  style={{ background: "#dc3545" }}
  onClick={async () => {

    await axios.put(
      `${API}/api/provider/hide-order`,
      {
        orderId: order._id,
        providerId: user._id
      }
    );

    fetchOrders();

  }}
>
  Delete
</button>



</li>


))

}



</ul>


}



</div>



</div>



</div>

);


}
