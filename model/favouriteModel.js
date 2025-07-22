const { query } = require("../database");

exports.add = (memberId, productId) => {
    return query(
        "INSERT INTO favourite (member_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [memberId, productId]
    );
};

exports.remove = (memberId, productId) => {
    return query(
        "DELETE FROM favourite WHERE member_id = $1 AND product_id = $2",
        [memberId, productId]
    );
};

exports.get = (memberId) => {
    return query(
        "SELECT p.id, p.name FROM favourite f JOIN product p ON f.product_id = p.id WHERE f.member_id = $1",
        [memberId]
    ).then((result) => result.rows);
};