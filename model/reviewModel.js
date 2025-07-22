const { query } = require("../database");

exports.create = (memberId, productId, rating, content) => {
    return query(
        "SELECT create_review($1, $2, $3, $4) AS message",
        [memberId, productId, rating, content]
    ).then((result) => result.rows[0].message);
};

exports.delete = (reviewId, memberId) => {
    return query(
        "SELECT delete_review($1, $2) AS message",
        [reviewId, memberId]
    ).then((result) => result.rows[0].message);
};

exports.get = (productId) => {
    return query(
        "SELECT r.review_id, r.rating, r.content, m.username FROM review r JOIN member m ON r.member_id = m.id WHERE r.product_id = $1 ORDER BY r.created_at DESC",
        [productId]
    ).then((result) => result.rows);
};
