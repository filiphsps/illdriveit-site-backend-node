'use strict';
let MBPM = require('./mbpn');

module.exports.GetMake = (req, res) => {
    MBPM.request('getvehiclemakes', {
        VehicleYear: (req.query.year || undefined)
    }, (err, makers) => {
        if (err || !makers)
            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        
        res.json({
            status: 200,
            data: makers.VehicleMakes
        });
    });
}

module.exports.GetModel = (req, res) => {
    if (!req.query.year)
        return res.json({
            status: 500,
            error: 'year is undefined',
            error_message: 'The year is required.'
        });
    if (!req.query.make)
        return res.json({
            status: 500,
            error: 'make is undefined',
            error_message: 'The maker is required.'
        });

    MBPM.request('getvehiclemodels', {
        VehicleYear: req.query.year,
        MakeCode: req.query.make
    }, (err, models) => {
        if (err || !models)
            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        else if (!models.VehicleModels)
            return res.json({
                status: 500,
                error: 'inavlid make or year',
                error_message: 'make or year is invalid.'
            });

        res.json({
            status: 200,
            data: models.VehicleModels
        });
    });
}