'use strict';
let express     = require("express"),
    bodyParser  = require("body-parser"),
    db          = require('./db.js'),
    warranty    = require('./warranty.js')
let app         = express();

var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({
  extended: true
}));

//Fix api calls from remote clients
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    next();
});

//Put payments router in place
app.use("/warranty", warranty.router);

app.get('/', (req, res) => {
    res.send('illdrive.it API');
});

//Init Database
db.initDB(() => {
    app.listen(8800/*, "localhost"*/);
}, (err) => {
    console.log('Unable to connect to the database: ', err);
    throw new Error(err);
});

//Make sure we recover if we for some reason crash
process.on('uncaughtException', function(err) {
    console.log(err);
});
