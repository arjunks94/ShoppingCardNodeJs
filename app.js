var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var hbs = require('express-handlebars');
var app = express();
var fileupload = require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session');
const nocache = require('nocache');
const handlebarsHelpers = require('handlebars-helpers')();
const moment = require('moment');
var DataTable = require( 'datatables.net' );

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
  helpers: {
    incremented: (index) => index + 1,
    eq: handlebarsHelpers.eq,
    formatDate: (date) => moment(date).format('DD-MM-YYYY')
  }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileupload());
app.use(session({ secret: "Key", cookie: { maxAge: 600000 }, resave: true, saveUninitialized: true }));
app.use(nocache());

db.connectToDatabase((err) => {
  if (err) {
    console.log("Connection Error: " + err);
  } else {
    console.log("Connection Success");
  }
});

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
