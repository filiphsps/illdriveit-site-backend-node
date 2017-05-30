'use strict';
let express     = require("express"),
    bodyParser  = require("body-parser"),
    db          = require('./db.js'),
    warranty    = require('./warranty.js'),
    log         = require('./v2/controllers/log.js').log;
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
//Add v2 api router
app.use('/v2', require('./v2'));

app.get('/', (req, res) => {
    res.send('illdrive.it API');
});

//Init Database
db.initDB(() => {
    app.listen(8800/*, "localhost"*/);
}, (err) => {
    log('Unable to connect to the database: ' + err, 3);
    throw new Error(err);
});

//Make sure we recover if we for some reason crash
process.on('uncaughtException', function(err) {
    log(err, 2)
});
