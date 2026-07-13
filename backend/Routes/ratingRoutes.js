const express = require("express");
const router = express.Router();

const Rating = require("../models/Rating");

// =========================
// SUBMIT RATING
// =========================
router.post("/submit", async (req, res) => {

  try {

    const {
      orderId,
      providerId,
      customerId,
      rating,
      review
    } = req.body;

    const alreadyRated = await Rating.findOne({ orderId });

    if (alreadyRated) {
      return res.status(400).json({
        message: "Order already rated."
      });
    }

    const newRating = await Rating.create({
      orderId,
      providerId,
      customerId,
      rating,
      review
    });

    res.json(newRating);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});

// =========================
// GET PROVIDER RATING
// =========================
router.get("/provider/:providerId", async (req, res) => {

  try {

    const ratings = await Rating.find({
      providerId: req.params.providerId
    });

    const total = ratings.reduce(
      (sum, r) => sum + r.rating,
      0
    );

    const average = ratings.length
      ? (total / ratings.length).toFixed(1)
      : 0;

    res.json({
      average,
      totalReviews: ratings.length,
      ratings
    });

  } catch (err) {

    res.status(500).json({
      message: "Server error"
    });

  }

});

module.exports = router;