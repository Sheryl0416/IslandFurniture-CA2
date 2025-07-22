const express = require('express');
const router = express.Router();
const middleware = require('../middleware');
const reviewModel = require("../model/reviewModel");

router.post('/api/review', middleware.checkToken, (req, res) => {
    const memberId = req.user.memberId;
    const { productId, rating, content } = req.body;
    reviewModel.create(memberId, productId, rating, content)
        .then((message) => res.json({ success: true, message }))
        .catch(() => res.status(500).json({ error: "Cannot submit review." }));
});

router.delete('/api/review', middleware.checkToken, (req, res) => {
    const memberId = req.user.memberId;
    const reviewId = req.body.reviewId;
    reviewModel.delete(reviewId, memberId)
        .then((message) => res.json({ success: true, message }))
        .catch(() => res.status(500).json({ error: "Cannot delete review." }));
});

router.get('/api/review/:productId', (req, res) => {
    const productId = req.params.productId;
    reviewModel.get(productId)
        .then((reviews) => res.json({ reviews }))
        .catch(() => res.status(500).json({ error: "Cannot get reviews." }));
});

module.exports = router;