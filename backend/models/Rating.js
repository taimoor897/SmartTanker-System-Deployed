const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
{
    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Order",
        required:true
    },

    providerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    customerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    rating:{
        type:Number,
        required:true,
        min:1,
        max:5
    },

    review:{
        type:String,
        default:""
    }

},
{
    timestamps:true
});

module.exports = mongoose.model("Rating", ratingSchema);