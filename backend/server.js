require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./user');
const Order = require('./models/Order');
const iotRoutes = require('./Routes/iotRoutes');
const ratingRoutes = require("./Routes/ratingRoutes");

const app = express();


// =========================
// MIDDLEWARE
// =========================

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://smarttanker-system-deployed-1.onrender.com"
  ],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =========================
// ROUTES
// =========================

app.use('/api/payment', require('./Routes/paymentRoutes'));
app.use('/api/complaints', require('./Routes/complaintRoutes'));
app.use('/api/admin', require('./Routes/adminRoutes'));
app.use('/api/iot', iotRoutes);
app.use("/api/rating", ratingRoutes);


// =========================
// ESP32 SENSOR
// =========================

let latestTankDistance = null;

app.post('/api/iot/tank-distance', (req,res)=>{

    const {distance} = req.body;

    if(
        distance === undefined ||
        typeof distance !== "number" ||
        distance < 0
    ){
        return res.status(400).json({
            success:false,
            message:"Invalid distance"
        });
    }


    latestTankDistance = distance;

    console.log("📡 ESP32 Distance:", distance);


    res.json({
        success:true,
        distance
    });

});


app.get('/api/iot/latest-distance',(req,res)=>{

    res.json({

        success: latestTankDistance !== null,

        distance: latestTankDistance,

        sensorConnected:
            latestTankDistance !== null

    });

});


// =========================
// DATABASE
// =========================

mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("✅ MongoDB connected");
})
.catch(err=>{
    console.log(err);
});



// =========================
// AUTH
// =========================

app.post('/api/auth/signup', async(req,res)=>{

try{

const {
name,
email,
password,
role
}=req.body;


const exists = await User.findOne({email});


if(exists){
return res.status(400).json({
message:"User already exists"
});
}



const user = await User.create({

name,
email,
password,
role: role || "customer"

});


res.status(201).json({

message:"Account created",

role:user.role

});


}catch(err){

res.status(500).json({
message:"Server error"
});

}

});



app.post('/api/auth/login',async(req,res)=>{

try{


const {
email,
password
}=req.body;



if(
email==="admin@gmail.com" &&
password==="123456"
){

return res.json({

token:"admin-token",

user:{
_id:"admin",
name:"Admin",
email,
role:"admin"
}

});

}



const user = await User.findOne({email});


if(
!user ||
!(await user.matchPassword(password))
){

return res.status(400).json({
message:"Invalid credentials"
});

}



const token = jwt.sign(

{
id:user._id,
role:user.role
},

process.env.JWT_SECRET,

{
expiresIn:"1h"
}

);



res.json({

token,

user:{
_id:user._id,
name:user.name,
email:user.email,
role:user.role
}

});


}catch(err){

res.status(500).json({
message:"Server error"
});

}


});



// =========================
// TANKER GPS
// =========================


let tankerLocation={

lat:33.6844,

lng:73.0479

};


let destination=null;



app.post('/api/tanker/update-location',
(req,res)=>{


const {
latitude,
longitude
}=req.body;



if(
typeof latitude !== "number" ||
typeof longitude !== "number"
){

return res.status(400).json({
message:"Invalid coordinates"
});

}



tankerLocation={

lat:latitude,

lng:longitude

};



console.log(
"🚚 Tanker GPS:",
tankerLocation
);



res.json({

success:true,

location:tankerLocation

});


});




app.get('/api/tanker-location',
(req,res)=>{


res.json({

location:tankerLocation

});


});




// =========================
// CREATE ORDER
// =========================


app.post('/api/order/create',
async(req,res)=>{


try{


const {
customerId,
phoneNumber,
location,
waterQuantity,
date,
time
}=req.body;



if(
!location ||
typeof location.latitude !== "number" ||
typeof location.longitude !== "number"
){

return res.status(400).json({

message:"Valid location required"

});

}



const order = new Order({

customerId,
phoneNumber,

providerId:null,


location:{

address:
location.address || "",

latitude:
location.latitude,

longitude:
location.longitude

},


waterQuantity,

date,

time,

status:"pending"


});



await order.save();



destination={

lat:location.latitude,

lng:location.longitude

};



console.log(
"📦 New Order:",
order._id
);



return res.status(201).json({

message:"Order created successfully",

order

});


}

catch(err){

console.log(err);


res.status(500).json({

message:"Server error"

});


}


});




// =========================
// CUSTOMER ORDERS
// =========================


app.get('/api/customer/orders/:customerId',
async(req,res)=>{


try{


const orders =
await Order.find({

customerId:req.params.customerId

})
.sort({
createdAt:-1
});


res.json(orders);



}catch(err){

res.status(500).json({
message:"Server error"
});

}


});



// =========================
// ALL ORDERS DEBUG
// =========================


app.get('/api/orders',
async(req,res)=>{


const orders =
await Order.find()
.sort({
createdAt:-1
});


res.json(orders);


});



// =========================
// PROVIDER ORDERS
// =========================


app.get('/api/provider/orders/:providerId', async (req, res) => {
  try {

    const provider = await User.findById(req.params.providerId);

    if (!provider) {
      return res.status(404).json({
        message: "Provider not found"
      });
    }

    const orders = await Order.find({
      hiddenForProviders: {
        $ne: provider._id
      }
    }).sort({ createdAt: -1 });

    console.log("Provider orders:", orders.length);

    res.json(orders);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});


app.put('/api/provider/hide-order', async (req, res) => {
  try {

    const { orderId, providerId } = req.body;

    await Order.findByIdAndUpdate(
      orderId,
      {
        $addToSet: {
          hiddenForProviders: providerId
        }
      }
    );

    res.json({
      success: true
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});




// =========================
// UPDATE ORDER STATUS
// =========================


app.put('/api/order/update-status',
async(req,res)=>{


try{


const {
orderId,
status,
providerId
}=req.body;



const order =
await Order.findById(orderId);



if(!order){

return res.status(404).json({

message:"Order not found"

});

}




if(status==="accepted"){


order.status="accepted";

order.providerId=providerId;

order.acceptedAt=new Date();


}

else{


order.status=status;


}



await order.save();



res.json({

message:"Status updated",

order

});



}catch(err){


console.log(err);


res.status(500).json({

message:"Server error"

});


}


});

app.put("/api/provider/availability", async (req, res) => {

  try {

    const { providerId, isAvailable } = req.body;

    await User.findByIdAndUpdate(
      providerId,
      { isAvailable }
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error"
    });

  }

});


app.get("/api/provider/availability/:providerId", async (req, res) => {

  try {

    const provider = await User.findById(req.params.providerId);

    if (!provider) {
      return res.status(404).json({
        message: "Provider not found"
      });
    }

    res.json({
      isAvailable: provider.isAvailable
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error"
    });

  }

});




// =========================
// ROOT
// =========================


app.get('/',(req,res)=>{

res.send(
"🚀 SmartTanker Backend Running"
);

});



// =========================
// START
// =========================


const PORT =
process.env.PORT || 5000;


app.listen(PORT,()=>{

console.log(
`✅ Server running on ${PORT}`
);

});
