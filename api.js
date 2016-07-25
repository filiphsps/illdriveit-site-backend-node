var express = require("express");
var bodyParser  = require("body-parser");
var db = require('./db.js');
var app  = express();
// var swig = require('swig');
// var path = require('path');
var warranty = require('./warranty.js')

var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(bodyParser.json({limit: '50mb'}));
//Fix iframe issues
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    next();
});
  // Put payments router in place
app.use("/warranty", warranty.router);

// app.engine('html', swig.renderFile);
//
// app.set('view engine', 'html');
// app.set('views', path.resolve(__dirname) + '/templates');

app.get('/', (req, res) => {
    res.send('hello world from site backend API');
});

db.initDB(() => {
    app.listen(8800/*, "localhost"*/);
}, (err) => {
    console.log('Unable to connect to the database:', err);
});

/* Make sure we recover if we for some reason crash */
process.on('uncaughtException', function(err) {
    console.log(err);
});
