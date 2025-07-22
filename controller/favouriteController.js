const express = require('express');
const router = express.Router();
const middleware = require('../middleware');
const favouriteModel = require("../model/favouriteModel");

router.post('/api/favourite', middleware.checkToken, (req, res) => {
    const memberId = req.user.memberId;
    const productId = req.body.productId;
    favouriteModel.add(memberId, productId)
        .then(() => res.json({ success: true, message: "Added to favourites." }))
        .catch(() => res.status(500).json({ error: "Cannot add to favourites." }));
});

router.delete('/api/favourite', middleware.checkToken, (req, res) => {
    const memberId = req.user.memberId;
    const productId = req.body.productId;
    favouriteModel.remove(memberId, productId)
        .then(() => res.json({ success: true, message: "Removed from favourites." }))
        .catch(() => res.status(500).json({ error: "Cannot remove from favourites." }));
});

router.get('/api/favourite', middleware.checkToken, (req, res) => {
    const memberId = req.user.memberId;
    favouriteModel.get(memberId)
        .then((favourites) => res.json({ favourites }))
        .catch(() => res.status(500).json({ error: "Cannot get favourites." }));
});

module.exports = router;

