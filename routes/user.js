var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers')
const userHelpers = require ('../helpers/user-helpers');


const verifyLogin = (req,res,next) => {
  if(req.session.user){
    // console.log("user verify : ",req.session.user.loggedIn)
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user = req.session.user
  // console.log(user);
  let cartCount=null;
  if(req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products)=>{
    res.render('user/view-products', { products, user, cartCount})
  })

});
router.get('/login',(req,res)=>{
  if(req.session.user){
    // console.log(req.session.user)
    res.redirect('/')
  }else{
  res.render('user/login',{"loginErr":req.session.userLoginErr})
  req.session.userLoginErr=false
  }
})

router.get('/signup', (req, res) => {
  if (req.session.user) {
    res.redirect('/');
  } else {
    res.render('user/signup');
  }
});

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    req.session.user = response;
    req.session.user.loggedIn = true
    res.redirect('/');
  }).catch((err) => {
    res.redirect('/signup');
  });
});

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      // console.log(response)
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    }else{
      req.session.userLoginErr = "Invalid Username or Password Login Failed"
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/')
})

router.get('/add-to-cart/:id', (req,res) => {
  // console.log("API Call");
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.get('/cart', verifyLogin, async (req, res) => {
  let user = req.session.user;
  let products = await userHelpers.getCartProducts(user._id);
  let proTotal = await userHelpers.getProductTotal(user._id);
  let totalValue = await userHelpers.getTotalAmount(user._id);
  let cartEmpty = false;
  if (totalValue == 0){
    cartEmpty = true
  }
  res.render('user/cart', { products, user, totalValue, proTotal, cartEmpty });
});

router.post('/change-product-quantity',verifyLogin, async (req, res) => {
  userCart = await userHelpers.getCart(req.session.user._id)
  let cartId = userCart._id
  try {
      // Call changeProductQuantity and wait for the response
      let response = await userHelpers.changeProductQuantity(req.body);

      // Retrieve cart total and product total separately

      let total = await userHelpers.getTotalAmount(req.body.user);
      let productInfo = await userHelpers.getProductTotal(req.body);
      // Append cartTotal and productTotal to the response object
      response.total = total;
      response.productTotal = productInfo.productTotal;
      response.quantity = productInfo.quantity;
      res.json(response);
  } catch (err) {
      console.error('Error in /change-product-quantity:', err);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/remove-product', async (req, res) => {
  try {
      await userHelpers.removeProduct(req.body);
      let total = await userHelpers.getTotalAmount(req.body.user);
      res.json({ status: true, total: total });
  } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/place-order', verifyLogin, async (req, res) => {
  let userId = req.session.user._id;
  let total = await userHelpers.getTotalAmount(userId);
  let cartItems = await userHelpers.getCartItems(userId); // Fetch cart items from DB
  let cartEmpty = false;
  if (total == 0){
    cartEmpty = true
    res.redirect('/')
  }else{
  const orderNumber = await userHelpers.generateUniqueOrderNumber(); // Generate unique order number

  res.render('user/place-order', {
      total,
      cartItems, // Pass cart items to template
      user: req.session.user,
      orderNumber // Pass order number to template
  })};
});


router.post('/order/placeOrder', verifyLogin, async (req, res) => {
  try {
      let cartItems = await userHelpers.getCartItems(req.session.user._id);
      let cartTotal = await userHelpers.getTotalAmount(req.session.user._id);
      // Use the order number from the request body
      let orderId = await userHelpers.placeOrder({ ...req.body, userId: req.session.user._id }, cartItems, cartTotal);
      if (req.body['paymentMethod']=='COD'){
        res.json({ codSuccess: true, orderId: orderId });
      }
      else{
        userHelpers.generateRazorpay(req.body.orderNumber,cartTotal).then((razorPayOrder)=>{
          // console.log("response : ",response)
          res.json(razorPayOrder)
        })
      }
      
  } catch (error) {
      console.error('Error placing order:', error);
      res.json({ success: false, error: 'Error placing order' });
  }
});



router.get('/placed-orders', verifyLogin, async (req, res) => {
  try {
      const userId = req.session.user._id;
      const orders = await userHelpers.getUserOrders(userId);
      res.render('user/placed-orders', { orders, user: req.session.user });
  } catch (error) {
      console.error('Error fetching order history:', error);
      res.status(500).send('Internal Server Error');
  }
});

router.get('/order-details', verifyLogin, async (req, res) => {
  const orderId = req.query.orderId;
  try {
      const order = await userHelpers.getOrderById(orderId); // Assuming you have a function to get order details
      res.render('user/order-details', {
          user: req.session.user,
          order
      });
  } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).send('Error fetching order details');
  }
});
router.post('/verify-payment', (req, res) => {
  userHelpers.verifyPayment(req.body).then(() => {
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
          // console.log("Payment Success");
          res.json({ status: true });
      }).catch((err) => {
          console.error('Error changing payment status:', err);
          res.json({ status: false, errMsg: "Payment Failed" });
      });
  }).catch((err) => {
      console.error('Error verifying payment:', err);
      res.json({ status: false, errMsg: "Payment Failed" });
  });
});


module.exports = router;
