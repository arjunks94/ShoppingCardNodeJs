var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('express');
const userHelpers = require ('../helpers/user-helpers');
const Razorpay = require('razorpay')
var instance = new Razorpay({ key_id: 'rzp_test_LsB6ulhtx6M1l7', key_secret: 'rcQ4rLUd7MJtEDnU9d4o8o4q' })

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                userData._id = data.insertedId;
                resolve(userData);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {};
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    } else {
                        resolve({ status: false });
                    }
                });
            } else {
                resolve({ status: false });
            }
        });
    },

    addToCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1
        };
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve();
                        });
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then((response) => {
                            resolve();
                        });
                }
            } else {
                let cartobj = {
                    user: new ObjectId(userId),
                    products: [proObj]
                };
                db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response) => {
                    resolve();
                });
            }
        });
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'products.item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        product: { $arrayElemAt: ['$product', 0] },
                        productPrice: { $toDouble: { $arrayElemAt: ['$product.Price', 0] } } // Convert Price to double
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: 1,
                        productTotal: { $multiply: ['$quantity', '$productPrice'] }
                    }
                }
            ]).toArray();

            resolve(cartItems);
        });
    }
    ,

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (cart) {
                count = cart.products.length;
            }
            resolve(count);
        });
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    { $match: { user: new ObjectId(userId) } },
                    { $unwind: '$products' },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'products.item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity',
                            product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ['$quantity', '$product.Price'] } }
                        }
                    }
                ]).toArray();
    
                if (total.length > 0) {
                    resolve(total[0].total);
                } else {
                    resolve(0);
                }
            } catch (err) {
                console.error('Error in getTotalAmount:', err);
                reject(err);
            }
        });
    },

    getProductTotal: (details) => {
        return new Promise(async (resolve, reject) => {
            try {
                let product = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    { $match: { user: new ObjectId(details.user) } },
                    { $unwind: '$products' },
                    { $match: { 'products.item': new ObjectId(details.product) } },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'products.item',
                            foreignField: '_id', // Correcting the foreign field
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity',
                            product: { $arrayElemAt: ['$product', 0] },
                            productPrice: { $toDouble: { $arrayElemAt: ['$product.Price', 0] } } // Convert Price to double
                        }
                    }
                ]).toArray();

                // console.log([product])
    
                if (product.length > 0) {
                    let productTotal = product[0].quantity * product[0].productPrice;
                    resolve({ productTotal, quantity: product[0].quantity });
                    // console.log(product[0].quantity)
                } else {
                    resolve({ productTotal: 0, quantity: 0 });
                }
            } catch (err) {
                console.error('Error in getProductTotal:', err);
                reject(err);
            }
        });
    },
    
    changeProductQuantity: (details) => {
        // console.log(details)
        details.quantity = parseInt(details.quantity);

        return new Promise(async (resolve, reject) => {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(details.user) });
                if (!cart) {
                    throw new Error('Cart not found');
                }

                db.get().collection(collection.CART_COLLECTION)
                    .updateOne(
                        {
                            _id: cart._id, // Assuming cart._id is the correct ObjectId of the cart document
                            'products.item': new ObjectId(details.product)
                        },
                        {
                            $set: { 'products.$.quantity': details.quantity }
                        }
                    ).then((response)=>{
                        // console.log({response})
                    resolve({ status: true });
            })
        })          
    },

    removeProduct: (details) => {
        const userId = new ObjectId(details.user);
        const productId = new ObjectId(details.product);
        

        return new Promise(async(resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(details.user) });
            db.get().collection(collection.CART_COLLECTION).updateOne(
                { _id: new ObjectId(cart._id) },
                { $pull: { products: { item: productId } } }
            ).then(() => resolve({ status: true })
            
        ).catch((err) => {
                console.error('Error removing product:', err);
                reject(err);
            });
        });
    },
    
    placeOrder: async (orderData, cartItems, cartTotal) => {

        return new Promise(async (resolve, reject) => {
            try {
                let status = orderData.paymentMethod === 'COD' ? 'Placed' : 'Pending';
    
                let orderObj = {
                    userId: new ObjectId(orderData.userId),
                    orderNumber: orderData.orderNumber, // Use the order number from the order data
                    name: orderData.name,
                    email: orderData.email,
                    phone: orderData.phone,
                    address: orderData.address,
                    country: orderData.country,
                    city: orderData.city,
                    pincode: orderData.pincode,
                    paymentMethod: orderData.paymentMethod,
                    products: cartItems,
                    total: cartTotal,
                    status: status,
                    date: new Date(),
                };
    
                let result = await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj);
                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne(result.insertedId);
    
                if (result.insertedId) {
                    await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(orderData.userId) });
                    resolve(result.insertedId, order.orderNumber);
                    // console.log(result.insertedId, order.orderNumber)
                } else {
                    reject('Order placement failed');
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    generateUniqueOrderNumber: async () => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        let orderNumber;
        let exists = true;
    
        while (exists) {
            const randomNumber = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
            orderNumber = `ORD${month}${year}-${randomNumber}`;
            const order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ orderNumber });
            if (!order) {
                exists = false;
            }
        }
    
        return orderNumber;
    },

    getCartItems: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: new ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            name: '$product.Name',
                            price: '$product.Price',
                            productTotal: { $multiply: ['$quantity', '$product.Price'] },
                        }
                    }
                ]).toArray();
    
                // Log cartItems for debugging
                // console.log('Cart Items:', cartItems);
    
                resolve(cartItems);
            } catch (error) {
                reject(error);
            }
        });
    },
    getCart: (userId) => {
        return new Promise(async(resolve,reject)=>{
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user: new ObjectId(userId)})
            resolve(userCart)
        })
    },
    getUserOrders: async (userId) => {
        try {
            // console.log('Fetching orders for user ID:', userId);
            const orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray();
            // console.log('Orders fetched:', orders);
            return orders;
        } catch (error) {
            // console.error('Error fetching user orders:', error);
            throw new Error('Error fetching user orders');
        }
    },
    getOrderById: async (orderId) => {
        try {
            // console.log('Fetching order by ID:', orderId);
            const order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: new ObjectId(orderId) });
            // console.log('Order fetched:', order);
            return order;
        } catch (error) {
            // console.error('Error fetching order:', error);
            throw new Error('Error fetching order');
        }
    },

    generateRazorpay: (orderId,cartTotal)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: cartTotal*100,
                currency: "INR",
                receipt: orderId
            };
            instance.orders.create(options,function(err, order){
                // console.log("New order : ",order)
                resolve(order)
            });
        })
    },
    verifyPayment: (details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256','rcQ4rLUd7MJtEDnU9d4o8o4q');
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus: (orderNumber) => {
        // console.log("Input : ", orderNumber);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ orderNumber: orderNumber }, // No need to convert orderNumber to ObjectId
                    {
                        $set: {
                            status: 'Placed'
                        }
                    }
                ).then((response) => {
                    if (response.modifiedCount > 0) {
                        resolve();
                    } else {
                        reject('Order not found or already updated');
                    }
                }).catch((err) => {
                    console.error('Error updating payment status:', err);
                    reject(err);
                });
        });
    }
};
