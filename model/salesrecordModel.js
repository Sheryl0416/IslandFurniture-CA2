var db = require('./databaseConfig.js');
var SalesRecord = require('./salesRecord.js')
var salesRecordDB = {
    insertSalesRecord: function (data) {
        return new Promise((resolve, reject) => {
            var conn = db.getConnection();
            conn.connect((err) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                var sql = `
                    INSERT INTO salesrecordentity 
                    (MEMBER_ID, AMOUNTPAID, CREATEDDATE) 
                    VALUES (?, ?, ?)`;

                conn.query(sql, [data.memberId, data.price, data.createdDate], (err, result) => {
                    conn.end();
                    if (err) return reject(err);
                    resolve({ success: true, generatedId: result.insertId });
                });
            });
        });
    }
};

module.exports = salesRecordDB