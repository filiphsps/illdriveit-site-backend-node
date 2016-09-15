'use strict';
let MBPM = require('./mbpn');


// GET /vehicle/info/make
// year: number, year of car creation
//
// Exposes all "make"s from MBPN.
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
        
        /* Standardize VehicleMakes */
        let data = [];

        for (var n = 0; n < makers.VehicleMakes.length; n++) {
            data.push({
                id: makers.VehicleMakes[n].MakeCode,
                name: makers.VehicleMakes[n].Description,
            });
        }

        res.json({
            status: 200,
            data: data
        });
    });
}

// GET /vehicle/info/model
// year: number, year of car creation
// make: string, the make code
//
// Exposes all models from MBPN.
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
        console.log(models);
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
        
        /* Standardize VehicleModels */
        let data = [];

        for (var n = 0; n < models.VehicleModels.length; n++) {
            data.push({
                id: models.VehicleModels[n].ModelCode,
                name: models.VehicleModels[n].Description,
            });
        }

        res.json({
            status: 200,
            data: data
        });
    });
}

// GET /vehicle/info/model
// year: number, year of car creation
// make: string, the make code
// model: string, the car model
//
// Exposes all cylinder amounts from MBPN.
module.exports.GetCylinders = (req, res) => {
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
    if (!req.query.model)
        return res.json({
            status: 500,
            error: 'model is undefined',
            error_message: 'The model is required.'
        });

    MBPM.request('getvehiclecylinders', {
        VehicleYear: req.query.year,
        MakeCode: req.query.make,
        ModelCode: req.query.model
    }, (err, cylinders) => {
        if (err || !cylinders)
            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        else if (!cylinders.VehicleCylinders)
            return res.json({
                status: 500,
                error: 'inavlid make, year or model',
                error_message: 'make, year or model is invalid.'
            });
        
        /* Standardize VehicleCylinders */
        let data = [];

        for (var n = 0; n < cylinders.VehicleCylinders.length; n++) {
            data.push({
                id: cylinders.VehicleCylinders[n].CylinderNumber,
                name: cylinders.VehicleCylinders[n].Description,
            });
        }

        res.json({
            status: 200,
            data: data
        });
    });
}

// GET /vehicle/info/wheel
// year: number, year of car creation
// make: string, the make code
// model: string, the car model
// cylinder: number, amount of cylinders
//
// Exposes all wheel types from MBPN.
module.exports.GetWheel = (req, res) => {
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
    if (!req.query.model)
        return res.json({
            status: 500,
            error: 'model is undefined',
            error_message: 'The model is required.'
        });
    if (!req.query.cylinders)
        return res.json({
            status: 500,
            error: 'cylinders is undefined',
            error_message: 'The cylinders is required.'
        });

    MBPM.request('getvehicledrivingwheeltypes', {
        VehicleYear: req.query.year,
        MakeCode: req.query.make,
        ModelCode: req.query.model,
        Cylinders: req.query.cylinders
    }, (err, wheels) => {
        if (err || !wheels)
            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        else if (!wheels.VehicleDrivingWheelTypes)
            return res.json({
                status: 500,
                error: 'inavlid make, year, cylinders or model',
                error_message: 'make, year, cylinders or model is invalid.'
            });
        
        /* Standardize VehicleDrivingWheelTypes */
        let data = [];

        for (var n = 0; n < wheels.VehicleDrivingWheelTypes.length; n++) {
            data.push({
                id: wheels.VehicleDrivingWheelTypes[n].DrivingWheelTypeCode,
                name: wheels.VehicleDrivingWheelTypes[n].Description,
            });
        }

        res.json({
            status: 200,
            data: data
        });
    });
}

// GET /vehicle/info/fuel
// year: number, year of car creation
// make: string, the make code
// model: string, the car model
// cylinder: number, amount of cylinders
//
// Exposes all fuel types from MBPN.
module.exports.GetFuel = (req, res) => {
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
    if (!req.query.model)
        return res.json({
            status: 500,
            error: 'model is undefined',
            error_message: 'The model is required.'
        });
    if (!req.query.cylinders)
        return res.json({
            status: 500,
            error: 'cylinders is undefined',
            error_message: 'The cylinders is required.'
        });
    if (!req.query.wheel)
        return res.json({
            status: 500,
            error: 'wheel is undefined',
            error_message: 'The wheel is required.'
        });

    MBPM.request('getvehiclefueltypes', {
        VehicleYear: req.query.year,
        MakeCode: req.query.make,
        ModelCode: req.query.model,
        Cylinders: req.query.cylinders,
        DrivingWheelTypeCode: req.query.wheel
    }, (err, fuel) => {
        if (err || !fuel)
            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        else if (!fuel.VehicleFuelTypes)
            return res.json({
                status: 500,
                error: 'inavlid make, year, cylinders, wheel or model',
                error_message: 'make, year, cylinders, wheel or model is invalid.'
            });
        
        /* Standardize VehicleFuelTypes */
        let data = [];

        for (var n = 0; n < fuel.VehicleFuelTypes.length; n++) {
            data.push({
                id: fuel.VehicleFuelTypes[n].FuelTypeCode,
                turbo: fuel.VehicleFuelTypes[n].HasTurbo,
                name: fuel.VehicleFuelTypes[n].Description,
            });
        }

        res.json({
            status: 200,
            data: data
        });
    });
}

// GET /vehicle/info/quote
// year: number, year of car creation
// make: string, the make code
// model: string, the car model
// cylinder: number, amount of cylinders
//
// Exposes all quotes for the car from MBPN.
module.exports.GetQuote = (req, res) => {
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
    if (!req.query.model)
        return res.json({
            status: 500,
            error: 'model is undefined',
            error_message: 'The model is required.'
        });
    if (!req.query.cylinders)
        return res.json({
            status: 500,
            error: 'cylinders is undefined',
            error_message: 'The cylinders is required.'
        });
    if (!req.query.wheel)
        return res.json({
            status: 500,
            error: 'wheel is undefined',
            error_message: 'The wheel is required.'
        });
    if (!req.query.fuel)
        return res.json({
            status: 500,
            error: 'wheel is undefined',
            error_message: 'The wheel is required.'
        });
    
    let params = {
        VehicleYear: req.query.year,
        VehicleMakeCode: req.query.make,
        VehicleModelCode: req.query.model,
        VehicleCylinders: req.query.cylinders,
        VehicleDrivingWheelsTypeCode: req.query.wheel,
        VehicleFuelTypeCode: req.query.fuel,
        Mileage: req.query.miles,
        HasTurbo: false,

        PurchasePrice: 6000,
        PurchaseDate: (new Date()).toISOString().slice(0, -5) + '-05:00',
        Statustype: 'Used',
    }
    MBPM.request('getquote', params, (err, quote) => {
        console.log(quote);
        //console.log(params);
        if (err || !quote)
            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        else if (!quote)
            return res.json({
                status: 500,
                error: 'inavlid make, year, cylinders, wheel or model',
                error_message: 'make, year, cylinders, wheel or model is invalid.'
            });
        
        /* Standardize VehicleFuelTypes */
        /*let data = [];

        for (var n = 0; n < fuel.VehicleFuelTypes.length; n++) {
            data.push({
                id: fuel.VehicleFuelTypes[n].FuelTypeCode,
                turbo: fuel.VehicleFuelTypes[n].HasTurbo,
                name: fuel.VehicleFuelTypes[n].Description,
            });
        }*/

        res.json({
            status: 200,
            data: quote
        });
    });
}