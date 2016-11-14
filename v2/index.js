'use strict';
let express     = require('express'),
    app         = express.Router(),
    config      = require('./config'),
    mongoose    = require('mongoose'),
    Request     = require('./models/request'),
    Vehicle     = require('./controllers/vehicle');

mongoose.connect(config.endpoint);

//TODO: request id and logging
app.use((req, res, next) => {
    let request = new Request({
        url: req.url,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    });

    request.save(function (err, result) {
        req.request_id = result._id;
        res.setHeader('X-Request-ID', req.request_id);

        var send = res.json;
        res.json = function (body) {
            body.request_id = req.request_id;
            send.call(this, body);
        };

        next();
    });
});

app.route('/').get((req, res) => {
    res.json({
        status: 200,
        message: 'illdrive.it API v2.0',
    });
});

app.route('/vehicle/info/make')
    .get(Vehicle.GetMake);
app.route('/vehicle/info/model')
    .get(Vehicle.GetModel);
app.route('/vehicle/info/cylinders')
    .get(Vehicle.GetCylinders);
app.route('/vehicle/info/wheel')
    .get(Vehicle.GetWheel);
app.route('/vehicle/info/fuel')
    .get(Vehicle.GetFuel);
app.route('/vehicle/info/quote')
    .get(Vehicle.GetQuote);
app.route('/vehicle/info/buy')
    .get(Vehicle.GetBuy);
app.route('/vehicle/info/contract')
    .get(Vehicle.GetContract);
app.route('/vehicle/info/completed')
    .get(Vehicle.GetCompleted);

app.get('*', function(req, res){
    res.status(404).json({
        status: 404,
        error: 'endpoint not defined',
        error_message: 'Endpoint not found.'
    });
});

module.exports = app;