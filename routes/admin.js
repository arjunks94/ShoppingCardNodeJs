var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
// const userHelpers = require('../helpers/user-helpers'); // Import userHelpers if not already

const verifyAdminLogin = (req, res, next) => {
  if (req.session.admin && req.session.admin.loggedIn) {
    next();
  } else {
    res.redirect('/admin');
  }
};

router.get('/', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin/view-products',{admin: true});
  } else {
    res.render('admin/admin-login', {admin: true, "loginErr": req.session.adminLoginErr });
    req.session.adminLoginErr = false;
  }
});

router.post('/login', (req, res) => {
  // console.log(req.body)
  productHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.adminuser;
      req.session.admin.loggedIn = true;
      res.redirect('/admin/view-products');
    } else {
      req.session.adminLoginErr = "Invalid Username or Password";
      res.redirect('admin/admin-login');
    }
  });
});

router.get('/signup', (req, res) => {
  if (req.session.user) {
    res.redirect('/');
  } else {
    res.render('admin/admin-signup');
  }
});

router.post('/signup', (req, res) => {
  // console.log(req.body)
  productHelpers.doSignup(req.body).then((response) => {
    req.session.admin = response;
    req.session.admin.loggedIn = true
    res.redirect('/admin');
  }).catch((err) => {
    res.redirect('/admin-signup');
  });
});


router.get('/view-products', verifyAdminLogin, (req, res) => {
  let adminUser = req.session.admin
  // console.log("[adminUser]);
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin: true, products, adminUser });
  });
});

router.get('/add-product', verifyAdminLogin, (req, res) => {
  res.render('admin/add-product');
});

router.post('/add-product', verifyAdminLogin, (req, res) => {
  productHelpers.addProduct(req.body, (insertedId) => {
    let image = req.files.Image;
    image.mv('./public/product-images/' + insertedId + '.jpg', (err) => {
      if (!err) {
        res.redirect('/admin/add-product');
      } else {
        console.error(err);
      }
    });
  });
});

router.get('/delete-product/:id', verifyAdminLogin, (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/view-products');
  }).catch((err) => {
    console.error(err);
    res.redirect('/admin/view-products');
  });
});

router.get('/edit-product/:id', verifyAdminLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render('admin/edit-product', { product });
});

router.post('/edit-product/:id', verifyAdminLogin, (req, res) => {
  let id = req.params.id;
  productHelpers.updateProduct(id, req.body).then(() => {
    res.redirect('/admin/view-products');
    if (req.files && req.files.Image) {
      let image = req.files.Image;
      image.mv('./public/product-images/' + id + '.jpg', (err) => {
        if (err) {
          console.error(err);
        }
      });
    }
  }).catch((err) => {
    console.error(err);
    res.redirect('/admin/edit-product/' + id);
  });
});

router.get('/all-orders',verifyAdminLogin, async(req,res)=>{
  let adminUser = req.session.admin;
  let orders = await productHelpers.getAllOrders();
  // console.log(orders)

res.render('admin/all-orders',{admin: true, orders})

})

router.get('/logout',(req,res)=>{
  req.session.destroy()
  res.redirect('/admin')
})

module.exports = router;
