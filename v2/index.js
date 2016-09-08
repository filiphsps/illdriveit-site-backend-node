'use strict';
let express     = require('express'),
    app         = express.Router(),

    Vehicle    = require('./controllers/vehicle');

//TODO: request id and logging
app.use((req, res, next) => {
    req.request_id = 'TODO';
    res.setHeader('X-Request-ID', req.request_id);

    var send = res.json;
    res.json = function (body) {
        body.request_id = req.request_id;
        send.call(this, body);
    };

    next();
});

app.route('/').get((req, res) => {
    res.json({
        status: 200,
        message: 'illdrive.it API v2.0'
    });
});

app.route('/vehicle/info/make')
    .get(Vehicle.GetMake);
app.route('/vehicle/info/model')
    .get(Vehicle.GetModel);
/*app.route('/vehicle/info/cylinders')
    .get(Vehicle.GetCylinders);
app.route('/vehicle/info/wheel')
    .get(Vehicle.GetWheel);
app.route('/vehicle/info/fuel')
    .get(Vehicle.GetFuel);*/

module.exports = app;