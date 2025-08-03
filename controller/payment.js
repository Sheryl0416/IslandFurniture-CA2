var express = require('express');
var app = express();
var member = require('../model/memberModel.js');
var salesRecord = require('../model/salesrecordModel.js');
var lineItem = require('../model/lineitemModel.js');
var salesRecord_lineItem = require('../model/salesrecord_lineitemModel.js');
var deliveryDetails = require('../model/deliveryDetailsModel.js');
var stripe = require("stripe")("sk_test_fHytNQpl6Bjt3Yo4ppWGgpU6");
let middleware = require('./middleware');

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json({ extended: false });

// GET Stripe Customer
app.get('/api/getStripeCustomer', middleware.checkToken, function (req, res) {
    var email = req.query.email;
    member.getMember(email)
        .then((result) => {
            if (result.stripeCustomerId == null || result.stripeCustomerId == "") {
                res.send({ success: false });
            } else {
                stripe.customers.retrieve(result.stripeCustomerId,
                    function (err, customer) {
                        if (!err) {
                            res.send({ success: true, customer: customer });
                        } else {
                            res.status(500).send("Failed to get stripe customer id");
                        }
                    });
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send("Failed to get member");
        });
});

// ✅ POST: New Card Payment
app.post('/api/processPaymentNewCard', [middleware.checkToken, jsonParser], async function (req, res) {
    const {
        memberId,
        email,
        price,
        name,
        phone,
        address,
        postalCode,
        deliveryDate,
        shoppingCart,
        saveCard,
        token
    } = req.body;

    try {
        let customer = null;

        if (saveCard) {
            const customers = await stripe.customers.list({ email });

            if (!customers.data || customers.data.length === 0) {
                customer = await stripe.customers.create({ email });
                await stripe.customers.createSource(customer.id, { source: token.id });
                await member.updateMemberStripeCustomerId(email, customer.id);
            } else {
                customer = customers.data[0];
                await stripe.customers.createSource(customer.id, { source: token.id });
            }
        }

        const charge = await stripe.charges.create({
            amount: price * 100,
            currency: "sgd",
            customer: customer.id,
            source: token.id, // fixed
            description: "Island Furniture Purchase"
        });

        const data = {
            memberId,
            email,
            price,
            name,
            phone,
            address,
            postalCode,
            deliveryDate,
            shoppingCart,
            createdDate: new Date() // ✅ Fix the 1970 date bug
        };

        insertDbRecords(data, res);

    } catch (err) {
        console.error("Stripe charge error:", err.message);
        res.send({ success: false, errMsg: err.message });
    }
});

// ✅ Helper: Insert all records
async function insertDbRecords(data, res) {
    try {
        const salesRecordResult = await salesRecord.insertSalesRecord(data);
        const salesRecordId = salesRecordResult.generatedId;

        console.log("🛒 Inserting line items...");
        for (let item of data.shoppingCart) {
            if (!item.id) {
                console.log("❌ Missing item.id in cart item:", item);
                return res.status(500).send({ success: false, errMsg: "Invalid cart item: missing item.id" });
            }

            const lineItemResult = await lineItem.insertLineItemRecord(item.quantity, item.id);

            if (!lineItemResult.success || !lineItemResult.generatedId) {
                console.log("❌ Failed to insert line item or missing ID:", lineItemResult);
                return res.status(500).send({ success: false, errMsg: "Failed to insert line item" });
            }

            const lineItemId = lineItemResult.generatedId;

            const linkResult = await salesRecord_lineItem.insertSalesRecordLineItemRecord(salesRecordId, lineItemId);

            if (!linkResult.success) {
                console.log("❌ Failed to link line item to sales record:", lineItemId);
                return res.status(500).send({ success: false, errMsg: "Failed to link line item to sales record" });
            }
        }

        res.send({ success: true, generatedId: salesRecordId });

    } catch (err) {
        console.error("❌ Error inserting sales data:", err);
        res.status(500).send("Failed to insert full sales data");
    }
}

// ✅ POST: Existing Card Payment
app.post('/api/processPaymentExistingCard', [middleware.checkToken, jsonParser], function (req, res) {
    const {
        memberId,
        email,
        price,
        cardId,
        customerId,
        shoppingCart,
        name,
        phone,
        address,
        postalCode,
        deliveryDate
    } = req.body;

    stripe.customers.retrieve(customerId, function (err, customer) {
        if (!err) {
            stripe.charges.create({
                amount: price * 100,
                currency: "sgd",
                description: "Island Furniture Purchase",
                customer: customer.id,
                source: cardId
            }).then(
                function () {
                    const data = {
                        memberId,
                        email,
                        price,
                        shoppingCart,
                        name,
                        phone,
                        address,
                        postalCode,
                        deliveryDate,
                        createdDate: new Date() // ✅ Fix for existing card too
                    };
                    insertDbRecords(data, res);
                },
                function (err) {
                    res.send({ success: false, errMsg: err.message });
                }
            );
        } else {
            res.status(500).send("Failed to get stripe customer");
        }
    });
});

// ✅ Insert Line Item only
app.post('/api/insertLineItemRecord', [middleware.checkToken, jsonParser], function (req, res) {
    const { quantity, id } = req.body;

    lineItem.insertLineItemRecord(quantity, id)
        .then((lineItem) => {
            if (lineItem.success) {
                res.send({ success: true, lineItemId: lineItem.generatedId });
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send("Failed to insert line item record");
        });
});

// ✅ Link LineItem to SalesRecord
app.post('/api/insertSalesRecordLineItemRecord', [middleware.checkToken, jsonParser], function (req, res) {
    const { salesRecordId, lineItemId } = req.body;

    salesRecord_lineItem.insertSalesRecordLineItemRecord(salesRecordId, lineItemId)
        .then((result) => {
            res.send(result.success);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send("Failed to insert sales record line item record");
        });
});

// ✅ Add Delivery Details
app.post('/api/addDeliveryDetails/', [middleware.checkToken, jsonParser], function (req, res) {
    deliveryDetails.addDeliveryDetails(req.body)
        .then((result) => {
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send("Failed to add delivery details");
        });
});

// ✅ Delete Stripe Card
app.post('/api/deleteCard/', [middleware.checkToken, jsonParser], function (req, res) {
    const { cardId, customerId } = req.body;

    stripe.customers.deleteSource(customerId, cardId, function (err, confirmation) {
        if (confirmation && confirmation.deleted) {
            res.send({ success: true });
        } else {
            res.send({ success: false, errMsg: "Error deleting card" });
        }
    });
});

module.exports = app;
