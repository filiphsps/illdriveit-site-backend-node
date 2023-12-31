'use strict';
let MBPM        = require('./mbpn'),
    config      = require('../config'),
    User        = require('../models/user'),
    Contract    = require('../models/contract'),
    log         = require('./log').log;
let stripe      = require('stripe')(config.stripe.dev ? config.stripe.key_dev : config.stripe.key);


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
            data: remove_motorcycles(data)
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
// miles: number, the miles driven
// cylinder: number, amount of cylinders
//
// Exposes all quotes for the car from MBPN.
module.exports.GetQuote = (req, res, turbo) => {
    if (typeof(turbo) !== 'boolean')
        turbo = false;

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
            error: 'fuel is undefined',
            error_message: 'The wheel is required.'
        });
    if (!req.query.miles)
        return res.json({
            status: 500,
            error: 'miles is undefined',
            error_message: 'The miles is required.'
        });
    if (!req.query.zip)
        return res.json({
            status: 500,
            error: 'zip is undefined',
            error_message: 'The zip is required.'
        });
    
    if (!supportedZip(req.query.zip))
        return res.json({
            status: 200,
            error: 'UNSUPPORTED_ZIP',
            error_message: 'We\'re working on supporting your state. Check back later.'
        });

    
    let params = {
        VehicleYear: req.query.year,
        VehicleMakeCode: req.query.make,
        VehicleModelCode: req.query.model,
        VehicleCylinders: req.query.cylinders,
        VehicleDrivingWheelsTypeCode: req.query.wheel,
        VehicleFuelTypeCode: req.query.fuel,
        Mileage: req.query.miles,
        HasTurbo: (turbo || false),

        PurchasePrice: 6000,
        PurchaseDate: (new Date()).toISOString().slice(0, -5) + '-00:00',
        Statustype: 'Used',
    }

    MBPM.request('getquote', params, (err, quote) => {
        if (err || !quote || !quote['Programs']) {
            if ((err || !quote || !quote['Programs']) && (turbo === true))
                return res.json({
                    status: 500,
                    error: err,
                    error_message: 'Something went wrong on mbpnetwork\'s end.'
                });

            //See if we support the car with turbo
            return module.exports.GetQuote(req, res, true);

        } else if (!quote)
            return res.json({
                status: 500,
                error: 'inavlid make, year, cylinders, wheel or model',
                error_message: 'make, year, cylinders, wheel or model is invalid.'
            });
        
        let plans = quote.Programs[0].Plans,
            options = {};

        //Months
        for (var n = 0; n < plans.length; n++) {
            if (options[(plans[n].CoverageMonths.toString())] !== undefined)
                continue;
            
            if ( plans[n].PlanTypeDescription !== 'PREMIUM')
                continue;
            
            //Add the months value as an option
            options[(plans[n].CoverageMonths.toString())] = {}
        }

        //Miles
        for (var n = 0; n < plans.length; n++) {
            if (options[(plans[n].CoverageMonths.toString())]
                        [(plans[n].CoverageMiles.toString())] !== undefined)
                continue;
            
            //Add the miles to month as an option
            //Eg oprions.[months].[miles]
            options[(plans[n].CoverageMonths.toString())]
                [(plans[n].CoverageMiles.toString())] = {
                    total: plans[n].CustomerPrice,
                    id: plans[n].PlanIdentifier,
                    quote_id: quote.ResponseID
                };
        }

        let result = calc_finance_options(options, quote.ResponseID);
        if (!result)
            return res.json({
                status: 500,
                error: null,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });

        res.json({
            status: 200,
            data: result,
            state: require('cities').zip_lookup(req.query.zip).state_abbr
        });
    });
}

// GET /vehicle/info/buy
// miles: number, the miles driven
// vin: string, the VIN
//
// Exposes all quotes for the car from MBPN.
module.exports.GetBuy = (req, res, quote) => {
    if (typeof(quote) !== 'object')
        quote = null;
    
    if (!req.query.miles)
        return res.json({
            status: 500,
            error: 'miles is undefined',
            error_message: 'The miles is required.'
        });
    if (!req.query.vin)
        return res.json({
            status: 500,
            error: 'vin is undefined',
            error_message: 'The vin is required.'
        });
    
    //Get plans from VIN, if it doesnt match; pick the closest one.
    if (!quote) {
        let params = {
            VIN:            req.query.vin,
            Mileage:        req.query.miles,
            PurchasePrice:  6000,
            PurchaseDate:   (new Date()).toISOString().slice(0, -5) + '-00:00',
            Statustype:     'used',
        }

        return MBPM.request('getquote', params, (err, quote) => {
            if (err) {
                return res.json({
                    status: 500,
                    error: 'car != vin',
                    error_message: 'The selected car doesn\'t match the VIN.'
                });
            }

            return module.exports.GetBuy(req, res, quote);
        });
    }

    
    //const Signature = req.query.signature.split(',')[1];
    const MONTHLY = (req.query.plan_months ? true : false);
    
    //TODO: Monthly card
    let params = {
        QuoteResponseID:        req.query.quote_id,
        VIN:                    req.query.vin,
        Mileage:                req.query.miles,

        PurchasePrice:          6000,
        PurchaseDate:           (new Date()).toISOString().slice(0, -5) + '-00:00',
        Statustype:             'used',

        Customer: {
            FirstName:          req.query.user_first_name,
            LastName:           req.query.user_last_name,
            Address1:           req.query.user_address1,
            Address2:           req.query.user_address2,
            City:               req.query.user_city,
            ZipCode:            req.query.user_zip,
            StateAbbreviation:  req.query.user_state,
            HomePhoneNumber:    req.query.user_phone,
            EmailAddress:       req.query.user_email,
        },

        //The plans to purchase
        Plans: [{
            PlanIdentifier: req.query.plan_id,
            CustomerPrice: req.query.plan_price,

            /* Finance-Only */
            Lender: (!req.query.plan_months) ? null : {
                DealerPaysMBPFinanceServiceFee: true,
                DownPaymentAmount: (!req.query.plan_months) ? req.query.plan_price : req.query.plan_down,
                FirstPaymentDate: mbpi_first_payment_date((new Date())),
                MBPFinancePlanType: mbpi_months_to_string(req.query.plan_months)
            },
            MBPFinanceAccountPayments: null
        }],
    }

    //Handle monthly
    if (MONTHLY) {
        params.Plans[0].MBPFinanceAccountPayments = {
            AccountPaymentType: 'CreditCard',
            CreditCardType: credit_card_typ(req.query.down_number.replace(/\D/g, '')),
            CardHolderName: req.query.down_first_name + ' ' + req.query.down_last_name,
            AccountNumber: req.query.down_number.replace(/\D/g, ''),
            ExpirationMonth: req.query.down_month,
            ExpirationYear: req.query.down_year,
            UseForDownPayment: true,
            UseForMonthlyPayment: true,
        }
    }

    MBPM.request('purchasecontract', params, (err, result) => {
        if (err) {
            log(err, 2);

            return res.json({
                status: 500,
                error: err,
                error_message: 'Something went wrong on mbpnetwork\'s end.'
            });
        }
        
        //TODO: Monthly

        if (!MONTHLY) {
            stripe.charges.create({
                amount: req.query.plan_price,
                currency: 'usd',
                receipt_email: req.query.user_email,

                source: {
                    exp_month: req.query.down_month,
                    exp_year: req.query.down_year,
                    number: req.query.down_number.replace(/\D/g, ''),
                    cvc: req.query.down_ccv,
                    object: 'card',
                },

                description: 'Downpayment on warranty for ' + req.query.user_first_name + ' ' + req.query.user_last_name,
            }, (err, charge) => {
                if (err) {
                    // The card has been declined
                    void_contract(result, (err, result) => {
                        return res.json({
                            status: 500,
                            error: 'card_declined',
                            error_message: 'The card was declined.'
                        });
                    });
                } else {
                    complete_payment(res, req, result);
                }
            });
        } else {
            complete_payment(res, req, result);
        }
    });
}

module.exports.GetCompleted = (req, res) => {
    Contract.find({ id: req.query.id })
    .populate('user')
    .exec((err, contracts) => {
        const contract = contracts[0];
        let emailjs = require('./email.js');

        emailjs.sendEmail('purchase', 'YOUR FORCEFIELD HAS BEEN ACTIVATED', {
            name: contract.user.first_name + ' ' + contract.user.last_name,
            email: contract.user.email
        }, {
            full_name: (contract.user.first_name + ' ' + contract.user.last_name).toUpperCase(),
            contract_url: 'https://api.illdrive.it/api/v2/vehicle/info/contract?id=' + contract.id,
            receipt_url: 'https://illdrive.it/receipt/#' + contract.id,
                email: contract.user.email
        }, (err) => {
            if (err)
                //TODO: Handle error
                return res.json({
                    status: 505,
                    error: err
                });

            res.json({
                status: 200
            });

            log('Email sent to ' + contract.user.email);
        });
    });
}

module.exports.GetContract = (req, res) => {
    //TODO: Auth?
    Contract.find({ id: req.query.id }, (cerr, contracts) => {
        const contract = contracts[0];
        const Ctr = new Buffer(contract.blob, 'base64');

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=contract_' + req.query.id + '.pdf',
            'Content-Length': Ctr.length
        });
        res.end(Ctr);
    })
}


/* Helper functions
======================================================== */

// complete_payment
function complete_payment (res, req, result) {
    //TODO: Find or create
    let user = new User({
        email: req.query.user_email,
        first_name: req.query.user_first_name,
        last_name: req.query.user_last_name,
        phone: req.query.user_phone,
    });

    user.save((err, user) => {
        let contract = new Contract({
            _id: result.GeneratedContracts[0].ContractNumber,
            id: result.GeneratedContracts[0].ContractNumber,
            blob: result.GeneratedContracts[0].ContractDocument.toString('ascii'),
            signature: req.query.signature,

            user: user._id, //Point to user
        });
        contract.save(function (err, result) {
            const contract = {
                blob: new Buffer(result.blob, 'base64'),
                id: result._id
            };

            log('Created contract with id: ' + contract.id);

            //TODO
            return res.json({
                status: 200,
                data: {
                    contract_id: contract.id,
                    contract_url: 'vehicle/info/contract/' + contract.id,
                    contract_filetype: 'pdf',
                    
                    state: require('cities').zip_lookup(req.query.user_zip).state_abbr,
                }
            });
        });
    })
}

// void_contract
function void_contract (purchase, callback) {
    MBPM.request('voidcontract', {
        PurchaseResponseID: purchase.ResponseID,
        VoidContracts: [{
            ContractNumber: purchase.GeneratedContracts[0].ContractNumber,
            VoidReason: 'UnableToFund'
        }]
    }, (err, result) => {
        if (err)
            log(err, 2);
        else
            log('Voided contract (' + result + ')');

        callback(err, result);
    });
}

// supportedZip
//
// Checks if a zip is supported
function supportedZip (zip) {
    let states = new Set([
		'IL',   //Illinois
		'OR',   //Oregon
		'NV',   //Nevada
		'CO',   //Colorado
		'WA',   //Washington
		'DE',   //Delaware
		'ID',   //Idaho
		'IN',   //Indiana
		'KS',   //Kansas
		'KY',   //Kentucky
		'MA',   //Massachusetts
		'MI',   //Michigan
		'MT',   //Montana
		'NJ',   //New Jersey
		'ND',   //North Dakota
		'OH',   //Ohio
		'PA',   //Pennsylvania
		'RI',   //Rhode Island
		'SD',   //South Dakota
		'TN',   //Tennessee
		'WV',   //West Virginia
		'TX',   //Texas
		'FL',   //Florida
		'AR',   //Arkansas
		'ME',   //Maine
		'NH',   //New Hampshire
		'VT',   //Vermont
		'MS',   //Mississippi
		'GA',   //Georgia
		'NE',   // Nebraska
		'UT',   // Utah
		'VA',   // Virginia
		'AL',   // Alabama
    ]);
    return states.has(require('cities').zip_lookup(zip).state_abbr.toUpperCase());
}

// remove_motorcycles
// motorcycles: array, the motorcycles array
// 
// Removes the motorcycle makers from the makers array
function remove_motorcycles (motorcycles) {
    let res = [];
    let motorcycles_makers = [
        'aprilia',
        'arctic car',
        'arctic cat',
        'artic cat',
        'bennche',
        'can-am',
        'ducati',
        'harley-davidson',
        'husqvarna',
        'indian motorcycle co.',
        'kawasaki',
        'ktm',
        'm.v. augusta',
        'moto guzzi',
        'piaggio',
        'polaris',
        'royal enfield',
        'royal enfield motors',
        'triumph motorcycle',
        'ural',
        'vespa',
        'victory',
        'victory motorcycles',
        'yamaha',
        'zero motorcycles inc',
    ];

    for(var n = 0; n < motorcycles.length; n++) {
        if (motorcycles_makers.indexOf(motorcycles[n].name.toLowerCase()) >= 0)
            continue;

        res.push(motorcycles[n]);
    }

    return res;
}

// calc_finance_options
// plans: array, the plans array
//
// Adds FinanceOptions array to every plan
function calc_finance_options (plans, quote_id) {
    //Disable financing
    //return plans;

    let terms = {
        '12': [6],
        '24': [6, 12],
        '36': [12, 15, 18],
        '48': [12, 15, 24],
        '60': [12, 15, 24]
    };

    for (var month in plans){
        let months = plans[month.toString()];
        if (!plans.hasOwnProperty(month))
            continue;

        for (var mile in month){
            if (!month.hasOwnProperty(mile))
                continue;

            let miles = months[Object.keys(months)[mile]];
            if (!miles)
                continue;
            
            let total = months[Object.keys(months)[mile]].total;
            if (!total)
                continue;
            
            let id = months[Object.keys(months)[mile]].id;
            if (!id)
                continue;

            //one 10th = down payment
            let down_payment = total * 0.1;
            let monthly_payment = total * 0.9;
            let options = [];

            for (var n = 0; n < terms[month].length; n++) {
                options.push({
                    months: terms[month][n],
                    payment: monthly_payment / (terms[month][n])
                });
            }

            months[Object.keys(months)[mile].toString()] = {
                total: total,
                id: id,
                quote_id: quote_id,
                down_payment: down_payment,
                finance_options: options
            };
        }
    }
    return plans;
}

// based on http://stackoverflow.com/a/19138852
function credit_card_typ (number) {
    var re = {
        Visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
        MasterCard: /^5[1-5][0-9]{14}$/,
        AmericanExpress: /^3[47][0-9]{13}$/,
        Discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    }

    for (var key in re) {
        if (re[key].test(number)) {
            return key
        }
    }

    return 'Unknown';
}

function mbpi_first_payment_date (date) {
    return (date.getMonth() + 1).toString() + "-" + date.getDate().toString() + "-" + date.getFullYear().toString();
}
function mbpi_months_to_string (months) {
    let opt = {
        6:  'SixMonth',
        12: 'TwelveMonth',
        15: 'FifteenMonth',
        18: 'EighteenMonth',
        24: 'TwentyFourMonth'
    }

    if (months in opt)
        return opt[months];
    else
        return null;
}