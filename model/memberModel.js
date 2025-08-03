var db = require('./databaseConfig.js');
var Member = require('./member.js');
var ShoppingCartLineItem = require('./shoppingCartLineItem.js');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
let jwt = require('jsonwebtoken');
let config = require('./config');
var memberDB = {
  checkMemberLogin: function (email, password) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        } else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], (err, result) => {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              if (!result || result.length === 0) {
                conn.end();
                return resolve({ success: false });
              }

              var member = new Member();
              member.email = result[0].EMAIL;
              member.passwordHash = result[0].PASSWORDHASH;

              // ✅ Check if account is activated (ACCOUNTACTIVATIONSTATUS must be 1)
              if (result[0].ACCOUNTACTIVATIONSTATUS != 1) {
                conn.end();
                return resolve({ success: false, errorMsg: 'Account is not activated.' });
              }

              bcrypt.compare(password, member.passwordHash, function (err, res) {
                if (res) {
                  var token = jwt.sign(
                    { username: member.email },
                    config.secret,
                    { expiresIn: '12h' }
                  );
                  conn.end();
                  return resolve({ success: true, email: member.email, token: token });
                } else {
                  conn.end();
                  return resolve({ success: false });
                }
              });
            }
          });
        }
      });
    });
  },

  getMemberAuthState: function (email) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              var member = new Member();
              member.accountActivationStatus = result[0].ACCOUNTACTIVATIONSTATUS;
              conn.end();
              return resolve(member);
            }
          });
        }
      });
    });
  },
  getMember: function (email) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        } else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else if (!result || result.length === 0) {
              conn.end();
              return resolve(null); // No such member
            }

            var row = result[0]; // 🧠 result is valid
            var member = new Member();

            member.id = row.ID;
            member.dob = row.DOB;
            member.accountActivationStatus = row.ACCOUNTACTIVATIONSTATUS;
            member.accountLockStatus = row.ACCOUNTLOCKSTATUS;
            member.activationCode = row.ACTIVATIONCODE;
            member.address = row.ADDRESS;
            member.age = row.AGE;
            member.city = row.CITY;
            member.cumulativeSpending = row.CUMULATIVESPENDING;
            member.email = row.EMAIL;
            member.income = row.INCOME;
            member.isDeleted = row.ISDELETED;
            member.joinDate = row.JOINDATE;
            member.loyaltyCardId = row.LOYALTYCARDID;
            member.loyaltyPoints = row.LOYALTYPOINTS;
            member.name = row.NAME;
            member.occupation = row.OCCUPATION;
            member.passwordHash = row.PASSWORDHASH;
            member.passwordReset = row.PASSWORDRESET;
            member.phone = row.PHONE;
            member.securityAnswer = row.SECURITYANSWER;
            member.securityQuestion = row.SECURITYQUESTION;
            member.sla = row.SERVICELEVELAGREEMENT;
            member.zipcode = row.ZIPCODE;
            member.loyaltyTierId = row.LOYALTYTIER_ID;
            member.country = row.CITY;
            member.wishlistId = row.WISHLIST_ID;
            member.stripeCustomerId = row.STRIPECUSTOMERID;

            conn.end();
            return resolve(member);
          });
        }
      });
    });
  },
  getBoughtItem: function (id) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = "SELECT i.SKU,i.NAME as 'ITEM_NAME',ic.RETAILPRICE,li.QUANTITY,sr.CREATEDDATE,f.IMAGEURL,sr.ID,"
            + " d.NAME, d.DELIVERY_ADDRESS, d.POSTAL_CODE, d.CONTACT"
            + " FROM itementity i,item_countryentity ic,lineitementity li,salesrecordentity sr,"
            + " salesrecordentity_lineitementity sl,furnitureentity f, deliverydetailsentity d"
            + " WHERE sr.MEMBER_ID=? AND d.SALERECORD_ID = sr.id AND i.ID=ic.ITEM_ID AND"
            + " ic.COUNTRY_ID=25 AND li.ITEM_ID=i.ID AND sr.ID=sl.SalesRecordEntity_ID AND"
            + " li.ID=sl.itemsPurchased_ID AND f.ID=i.ID";
          conn.query(sql, [id], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              var itemList = [];
              for (var i = 0; i < result.length; i++) {
                var boughtItems = new ShoppingCartLineItem();
                boughtItems.id = result[i].ID;
                boughtItems.sku = result[i].SKU;
                boughtItems.itemName = result[i].ITEM_NAME;
                boughtItems.retailPrice = result[i].RETAILPRICE;
                boughtItems.quantity = result[i].QUANTITY;
                boughtItems.createddate = result[i].CREATEDDATE;
                boughtItems.imageUrl = result[i].IMAGEURL;
                boughtItems.customerName = result[i].NAME;
                boughtItems.address = result[i].DELIVERY_ADDRESS;
                boughtItems.postalCode = result[i].POSTAL_CODE;
                boughtItems.phone = result[i].CONTACT;
                itemList.push(boughtItems);
              }
              conn.end();
              return resolve(itemList);
            }
          });
        }
      });
    });
  },
  checkMemberEmailExists: function (email) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              if (result.length == 0) {
                conn.end();
                return resolve(false);
              }
              else {
                conn.end();
                return resolve(true);
              }
            }
          });
        }
      });
    });
  },
  registerMember: function (email, password, hostName) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          bcrypt.hash(password, 5, function (err, hash) {
            var activationCode = generateRandomNumber(40);
            var passwordReset = generateRandomNumber(40);
            var sqlArgs = [activationCode, email, new Date(), hash, passwordReset];
            var sql = 'INSERT INTO memberentity(ACTIVATIONCODE,EMAIL,JOINDATE,PASSWORDHASH,PASSWORDRESET,LOYALTYTIER_ID, ACCOUNTACTIVATIONSTATUS) values(?,?,?,?,?,15,1)';

            conn.query(sql, sqlArgs, function (err, result) {
              if (err) {
                conn.end();
                return reject(err);
              } else {
                if (result.affectedRows > 0) {
                  var mailOptions = {
                    from: 'islandfurnituresep@gmail.com',
                    to: email,
                    subject: 'Island Furniture Member Account Activation',
                    text: 'Greetings from Island Furniture... \n\n'
                      + 'Click on the link below to activate your Island Furniture account: \n\n'
                      + 'http://' + hostName + '/activateMemberAccount.html?email=' + email + '&activateCode=' + activationCode
                  };
                  emailer.sendMail(mailOptions, function (error, info) {
                    if (error) {
                      console.log(error);
                    }
                  });
                  conn.end();
                  return resolve({ success: true });
                }
              }
            });
          });
        }
      });
    });
  },
  getMemberActivateCode: function (email) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              var member = new Member();
              member.activationCode = result[0].ACTIVATIONCODE;
              conn.end();
              return resolve(member);
            }
          });
        }
      });
    });
  },
  memberActivateAccount: function (email) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          sql = 'UPDATE memberentity SET ACCOUNTACTIVATIONSTATUS=1 WHERE EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              if (result.affectedRows > 0) {
                conn.end();
                return resolve({ success: true });
              }
            }
          });
        }
      });
    });
  },
  updateMember: function (details) {
    return new Promise((resolve, reject) => {
      console.log("📥 updateMember received data:", details); // DEBUG

      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log("❌ DB connection error:", err);
          conn.end();
          return reject(err);
        }

        // Extract all fields from details
        var email = details.email;
        var name = details.name;
        var phone = details.phone;
        var country = details.country;
        var address = details.address;
        var securityQuestion = parseInt(details.securityQuestion);
        var securityAnswer = details.securityAnswer;
        var age = parseInt(details.age);
        var income = parseInt(details.income);
        var sla = parseInt(details.sla);
        var password = details.password;

        const fetchUpdatedMember = () => {
          var getSql = 'SELECT * FROM memberentity WHERE EMAIL = ?';
          conn.query(getSql, [email], function (err, result) {
            conn.end();
            if (err) {
              console.log("❌ Failed to fetch updated member:", err);
              return reject(err);
            }
            if (result.length === 0) {
              console.log("❌ No member found after update.");
              return reject({ error: "No member found after update." });
            }

            console.log("✅ Member successfully updated.");
            return resolve({ success: true, updatedMember: result[0] });
          });
        };

        // Update without password
        if (!password || password.trim() === '') {
          var sql = `UPDATE memberentity SET NAME=?, PHONE=?, CITY=?, ADDRESS=?, SECURITYQUESTION=?,
                               SECURITYANSWER=?, AGE=?, INCOME=?, SERVICELEVELAGREEMENT=? WHERE EMAIL=?`;
          var sqlArgs = [name, phone, country, address, securityQuestion, securityAnswer, age, income, sla, email];

          conn.query(sql, sqlArgs, function (err, result) {
            if (err) {
              console.log("❌ SQL update error (no password):", err);
              conn.end();
              return reject(err);
            }

            console.log("📤 SQL result (no password):", result);

            if (result.affectedRows > 0) {
              fetchUpdatedMember();
            } else {
              conn.end();
              return reject(new Error("No member record updated (no password)"));
            }
          });

        } else {
          // Update with password
          bcrypt.hash(password, 5, function (err, hash) {
            if (err) {
              console.log("❌ bcrypt error:", err);
              conn.end();
              return reject(err);
            }

            var sql = `UPDATE memberentity SET NAME=?, PHONE=?, CITY=?, ADDRESS=?, SECURITYQUESTION=?,
                                   SECURITYANSWER=?, AGE=?, INCOME=?, SERVICELEVELAGREEMENT=?, PASSWORDHASH=? WHERE EMAIL=?`;
            var sqlArgs = [name, phone, country, address, securityQuestion, securityAnswer, age, income, sla, hash, email];

            conn.query(sql, sqlArgs, function (err, result) {
              if (err) {
                console.log("❌ SQL update error (with password):", err);
                conn.end();
                return reject(err);
              }

              console.log("📤 SQL result (with password):", result);

              if (result.affectedRows > 0) {
                fetchUpdatedMember();
              } else {
                conn.end();
                return reject(new Error("No member record updated (with password)"));
              }
            });
          });
        }
      });
    });
  },

  sendPasswordResetCode: function (email, url) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              var member = JSON.parse(JSON.stringify(result[0]));
              var mailOptions = {
                from: 'islandfurnituresep@gmail.com',
                to: email,
                subject: 'Island Furniture Member Password Reset',
                text: 'Greetings from Island Furniture... \n\n'
                  + 'Here is your activation code to be keyed in in order to reset your member account password :\n\n'
                  + 'Activation Code: ' + member.PASSWORDRESET + '\n\n'
                  + 'Link to reset your password: http://' + url + '/memberResetPassword.html?email=' + email
              };
              emailer.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.log(error);
                }
              });
              conn.end();
              return resolve({ success: true });
            }
          });
        }
      });
    });
  },
  getPasswordResetCode: function (email) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'SELECT * FROM memberentity m WHERE m.EMAIL=?';
          conn.query(sql, [email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              var member = new Member();
              member.passwordReset = result[0].PASSWORDRESET;
              conn.end();
              return resolve(member);
            }
          });
        }
      });
    });
  },
  updateMemPasswordAndResetCode: function (email, password) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          bcrypt.hash(password, 5, function (err, hash) {
            var sql = 'UPDATE memberentity SET PASSWORDHASH=?,PASSWORDRESET=? WHERE EMAIL=?';
            var sqlArgs = [hash, generateRandomNumber(40), email];
            conn.query(sql, sqlArgs, function (err, result) {
              if (err) {
                conn.end();
                return reject(err);
              } else {
                if (result.affectedRows > 0) {
                  conn.end();
                  return resolve({ success: true });
                }
              }
            });
          });
        }
      });
    });
  },
  sendFeedback: function (name, email, subject, message) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'INSERT INTO feedbackentity(EMAIL,MESSAGE,NAME,SUBJECT) values(?,?,?,?)';
          conn.query(sql, [email, message, name, subject], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              if (result.affectedRows > 0) {
                var mailOptions = {
                  from: 'islandfurnituresep@gmail.com',
                  to: 'islandfurnituresep@gmail.com',
                  subject: 'Island Furniture Member Feedback',
                  text: 'Feedback from Island Furniture member'
                    + '\nName: ' + name
                    + '\nEmail: ' + email
                    + '\nSubject: ' + subject
                    + '\nMessage:\n\n' + message
                };
                emailer.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.log(error);
                  }
                });
                conn.end();
                return resolve({ success: true });
              }
            }
          });
        }
      });
    });
  },
  verifyPassword: function (id, password) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'SELECT * FROM memberentity m WHERE m.ID=?';
          conn.query(sql, [id], (err, result) => {
            if (err) {
              conn.end();
              return reject(err);
            }
            else {
              if (result == null || result == undefined || result == '') {
                conn.end();
                return resolve({ success: false });
              }
              var member = new Member();
              member.email = result[0].EMAIL;
              member.passwordHash = result[0].PASSWORDHASH;

              bcrypt.compare(password, member.passwordHash, function (err, res) {
                if (res) {
                  conn.end();
                  return resolve({ success: true });
                } else {
                  conn.end();
                  return resolve({ success: false });
                }
              });
            }
          });
        }
      });
    });
  },
  updateMemberStripeCustomerId: function (email, customerId) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'UPDATE memberentity SET STRIPECUSTOMERID=? WHERE EMAIL=?';
          conn.query(sql, [customerId, email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              if (result.affectedRows > 0) {
                conn.end();
                return resolve({ success: true });
              }
            }
          });
        }
      });
    });
  },
  updateMemberDeliveryDetails: function (email, name, contactNum, address, postalCode) {
    return new Promise((resolve, reject) => {
      var conn = db.getConnection();
      conn.connect(function (err) {
        if (err) {
          console.log(err);
          conn.end();
          return reject(err);
        }
        else {
          var sql = 'UPDATE memberentity SET NAME=?, PHONE=?, ADDRESS=?, ZIPCODE=? WHERE EMAIL=?';
          conn.query(sql, [name, contactNum, address, postalCode, email], function (err, result) {
            if (err) {
              conn.end();
              return reject(err);
            } else {
              if (result.affectedRows > 0) {
                conn.end();
                return resolve({ success: true });
              }
            }
          });
        }
      });
    });
  }
};
module.exports = memberDB

var generateRandomNumber = function (digits) {
  return crypto.randomBytes(Math.ceil(digits / 2)).toString('hex');
};

var emailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'islandfurnituresep@gmail.com',
    pass: 'islandFurniture123'
  }
});