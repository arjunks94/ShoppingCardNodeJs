var fs = require('fs');
var path = require('path');
var db = require('../config/connection');
const bcrypt = require('bcrypt');
var collection = require('../config/collections');
var objectId = require('mongodb').ObjectId;

module.exports = {

  addProduct: (product, callback) => {
    db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
      callback(data.insertedId);
    });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
      resolve(products);
    });
  },

  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new objectId(prodId) }).then((response) => {
        if (response.deletedCount > 0) {
          const imagePath = path.join(__dirname, '..', 'public', 'product-images', `${prodId}.jpg`);
          fs.unlink(imagePath, (err) => {
            if (err) {
              console.error(`Failed to delete image file: ${imagePath}`, err);
            } else {
              console.log(`Successfully deleted image file: ${imagePath}`);
            }
            resolve(response);
          });
        } else {
          resolve(response);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  },

  getProductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new objectId(prodId) }).then((product) => {
        resolve(product);
      });
    });
  },

  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({ _id: new objectId(proId) }, {
          $set: {
            Name: proDetails.Name,
            Description: proDetails.Description,
            Price: proDetails.Price,
            Category: proDetails.Category
          }
        }).then((response) => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
    });
  },

  doLogin: (userData) => {
    // console.log("Recieved Data : ",[userData])
    return new Promise(async (resolve, reject) => {
      let response = {};
      let user = await db.get().collection(collection.ADMINUSER_COLLECTION).findOne({ userid: userData.userid });
      // console.log("DB User : ",{user})
      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            response.adminuser = user;
            response.status = true;
            resolve(response);
          } else {
            resolve({ status: false });
          }
        }).catch((err) => {
          reject(err);
        });
      } else {
        resolve({ status: false });
      }
    });
  },
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
        userData.Password = await bcrypt.hash(userData.password, 10);
        db.get().collection(collection.ADMINUSER_COLLECTION).insertOne(userData).then((data) => {
            userData._id = data.insertedId;
            resolve(userData);
        }).catch((err) => {
            reject(err);
        });
    });
},

getAllOrders: () => {
  return new Promise((resolve, reject) => {
    db.get().collection(collection.ORDER_COLLECTION)
      .find({ status: 'Placed' })
      .project({ orderNumber: 1, date: 1, paymentMethod: 1, name: 1, total: 1, status: 1 }) // Project the desired fields
      .toArray()
      .then((orders) => {
        resolve(orders);
      })
      .catch((err) => {
        reject(err);
      });
  });
}
};
