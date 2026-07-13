const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Customer delivery location
  location: {
    address: {
      type: String,
      default: ""
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },

  hiddenForProviders: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}],

phoneNumber: {
  type: String,
  required: true
},

  waterQuantity: {
    type: Number,
    default: 1
  },

  date: {
    type: String,
    default: ""
  },

  time: {
    type: String,
    default: ""
  },

  

 status:{
 type:String,
 enum:[
 'pending',
 'confirmed',
 'assigned',
 'accepted',
 'delivered',
 'cancelled'
 ],
 default:'pending'
}
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);