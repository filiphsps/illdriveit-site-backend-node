'use strict';
var express = require('express');
var db = require('./db.js');
var fs = require('fs-extra')
var utils = require('./utilities.js');
var path = require('path');
var requestify = require('requestify');
var uuid = require('node-uuid');
var zipValidator = require('./zip_validation.js')
var imagemagick = require('imagemagick-native')

var stripeWarrantyApiKeyProduction = "ENTER_HERE_YOUR_PRODUCTION_KEY"
var stripeWarrantyApiKeyTesting = "sk_test_nPr0hqYbXY4wc1STkZvKukWX"
var stripe = require('stripe')(stripeWarrantyApiKeyTesting);

var MBPCredentials = {
    Server: "http://testdealerservices.mbpnetwork.com",
    Dealercode: "012065",
    Accountusername: "tirekickers",
    AccountPassword: "WERQ890XcvzYD!",
}

var router = express.Router();
router.get("/", (req, res) => {
    res.send("Hello from warranty")
});

router.post("/verifyzip", (req, res) => {
    let vin = req.body.vin;
    let zip = req.body.zip;
    let mileage = req.body.mileage;
    if (typeof mileage !== 'number') {
        utils.sendError(res, "wrong mileage");
        return;
    }
    if (typeof zip !== 'string') {
        utils.sendError(res, "wrong zip");
        return;
    }
    if (typeof vin !== 'string') {
        utils.sendError(res, "wrong vin");
        return;
    }
    db.addZIP(zip, vin, () => {
        validateYear(vin, (yearIsValid) => {
            console.log("Year valid ", yearIsValid);
            zipValidator.validateZIP(zip, (isZipValid, state, city) => {
              console.log("zip validated");
                res.jsonp({
                    zipValid: isZipValid,
                    mileageValid: (mileage <= 60000),
                    yearValid: yearIsValid,
                    state: state,
                    city: city
                });
                return;
            })
        });
    }, (error) => {
        res.jsonp({
            valid: false,
            error: error,
            mileageValid: false,
            yearValid: false
        });
        return;
    });
})

router.get("/vehiclename", (req, res) => {
    const vin = req.query.vin;
    if (!vin) {
        res.jsonp({
            name: "VEHICLE",
            model: "VEHICLE"
        });
        return;
    }
    decodeVin(vin, (result) => {
        let year = result.years.reduce((previous, elem) => {
            // body...
            return Math.max(elem.year, previous);
        }, 0);
        let model = result.model.name
        let make = result.make.name
        res.jsonp({
            name: ("" + year + " " + make + " " + model).toUpperCase(),
            model: model.toUpperCase()
        });
    }, (error) => {
        res.jsonp({
            name: "VEHICLE",
            model: "VEHICLE"
        })
    })
})

function validateYear(vin, result) {
    getYear(vin, (yearResult) => {
        let now = new Date();
        let diff = now.getFullYear() - yearResult;
        result((diff <= 10));
    })
}

function getYear(vin, result) {
    decodeVin(vin, (jsonBody) => {
        let year = jsonBody.years.reduce((previous, elem) => {
            // body...
            return Math.max(elem.year, previous);
        }, 0);
        console.log("Response year: ", year);
        result(year);
    }, (error) => {
        result(0);
    })
}

function decodeVin(vin, success, failed) {
    requestify.get("https://api.edmunds.com/api/vehicle/v2/vins/" +
        vin + "?fmt=json&api_key=y2wzse9sxruvn2nfgw9fn9ar").then((response) => {
        if (!response) {
            failed("No response");
            return;
        }
        let jsonBody = response.getBody();
        console.log("Response:", jsonBody);
        success(jsonBody);
    }, (error) => {
        failed(error)
    })
}

router.post("/emailtonotify", (req, res) => {
    let vin = req.body.vin;
    let email = req.body.email;
    if (typeof email !== 'string') {
        utils.sendError(res, "wrong email");
        return;
    }
    if (typeof vin !== 'string') {
        utils.sendError(res, "wrong vin");
        return;
    }
    db.addEmailForNotification(email, vin, () => {
        res.jsonp({
            result: "success"
        });
        return;
    }, (error) => {
        utils.sendError(res, error);
        return;
    });

})


function verifyVehiclePost(req, res, next) {
    if ((req.body.warrantyRequest === undefined) ||
        (req.body.warrantyRequest === null)) {
        utils.sendError(res, "warrantyRequest field not defined");
        return
    }
    if (!Boolean(req.body.quoteResponseId)) {
        utils.sendError(res, "No quoteResponseId");
        return;
    }
    if ((req.body.planId === undefined) || (req.body.planId === null)) {
        utils.sendError(res, "No planId");
        return;
    }
    if (!Boolean(req.body.customerPrice)) {
        utils.sendError(res, "No customerPrice");
        return;
    }
    let warrantyRequest = req.body.warrantyRequest;
    if (!Boolean(warrantyRequest.vin)) {
        utils.sendError(res, "No warrantyRequest.vin");
        return;
    }
    if (!Boolean(warrantyRequest.mileage)) {
        utils.sendError(res, "No warrantyRequest.mileage");
        return;
    }
    if (!Boolean(warrantyRequest.first_name)) {
        utils.sendError(res, "No warrantyRequest.first_name");
        return;
    }
    if (!Boolean(warrantyRequest.last_name)) {
        utils.sendError(res, "No warrantyRequest.last_name");
        return;
    }
    if (!Boolean(warrantyRequest.address1)) {
        utils.sendError(res, "No warrantyRequest.address1");
        return;
    }
    if (!Boolean(warrantyRequest.city)) {
        utils.sendError(res, "No warrantyRequest.city");
        return;
    }
    if (!Boolean(warrantyRequest.state)) {
        utils.sendError(res, "No warrantyRequest.state");
        return;
    }
    if (!Boolean(warrantyRequest.zip)) {
        utils.sendError(res, "No warrantyRequest.zip");
        return;
    }
    if (!Boolean(warrantyRequest.phone)) {
        utils.sendError(res, "No warrantyRequest.phone");
        return;
    }
    if (!Boolean(warrantyRequest.email)) {
        utils.sendError(res, "No warrantyRequest.email");
        return;
    }
    if (!Boolean(req.body.paymentOption)) {
        utils.sendError(res, "No paymentOption");
        return;
    }
    if (!Boolean(req.body.paymentOption.downpayment)) {
        utils.sendError(res, "No paymentOption.downpayment");
        return;
    }
    if ((req.body.paymentOption.number_of_months === undefined) ||
        (req.body.paymentOption.number_of_months === null)) {
        utils.sendError(res, "No paymentOption.number_of_months");
        return;
    }
    if (!Boolean(req.body.paymentOption.downpaymentCard)) {
        utils.sendError(res, "No paymentOption.downpaymentCard");
        return;
    }
    if (!Boolean(req.body.paymentOption.financeCard)) {
        utils.sendError(res, "No paymentOption.financeCard");
        return;
    }
    let downpaymentCardError = checkCardDataPresent(req.body.paymentOption.downpaymentCard, "downpaymentCard");
    if (Boolean(downpaymentCardError)) {
        utils.sendError(res, downpaymentCardError);
        return;
    }
    let financeCardError = checkCardDataPresent(req.body.paymentOption.financeCard, "financeCard");
    if (Boolean(financeCardError)) {
        utils.sendError(res, financeCardError);
        return;
    }

    next();
}

function checkCardDataPresent(card, type) {
    if (!Boolean(card.account_number)) {
        card.account_number = card.account_number.replace(/\D/g, "")
        return "No " + type + ".account_number";
    }
    if (!Boolean(card.cardholder_name)) {
        return "No " + type + ".cardholder_name";
    }
    if (!Boolean(card.expiration_month)) {
        return "No " + type + ".expiration_month";
    }
    if (!Boolean(card.expiration_year)) {
        return "No " + type + ".expiration_year";
    }
}

Date.prototype.toMBPIString = function() {
    let dateStr = (this.getMonth() + 1).toString() + "-" +
        this.getDate().toString() + "-" +
        this.getFullYear().toString();
    return dateStr;
};

function numberToStringTerm(numberTerm) {
    let dict = {
        6: "SixMonth",
        12: "TwelveMonth",
        15: "FifteenMonth",
        18: "EighteenMonth",
        24: "TwentyFourMonth"
    }
    if (numberTerm in dict) {
        return dict[numberTerm];
    } else {
        return null;
    }
}

function formMBPFinanceAccountPayments(internalPayment, isDownpayment) {
    let res = {
        AccountPaymentType: "CreditCard",
        CreditCardType: cardType(internalPayment.account_number.replace(/\D/g, "")),
        CardHolderName: internalPayment.cardholder_name,
        AccountNumber: internalPayment.account_number.replace(/\D/g, ""), // Card number
        ExpirationMonth: internalPayment.expiration_month,
        ExpirationYear: internalPayment.expiration_year,
        UseForDownPayment: isDownpayment,
        UseForMonthlyPayment: !isDownpayment
    }
    return res
}

function cardType(accountNumber) {
    function inRangeInclusive(value, start, end) {
        return ((value >= start) && (value <= end))
    }
    let visaLengths = new Set([13, 16, 19]);
    // console.log("A/N:\"",accountNumber,"\" length ", accountNumber.length,
    // "starts ", accountNumber.startsWith("4"), " in ", (accountNumber.length in [13, 16, 19]) );
    if (accountNumber.startsWith("4") && (visaLengths.has(accountNumber.length))) {
        return "Visa"
    }
    let first2Numbers = parseInt(accountNumber.substr(0, 2));
    if (inRangeInclusive(first2Numbers, 51, 55) && (accountNumber.length === 16)) {
        return "MasterCard"
    }
    if ((first2Numbers in [34, 37]) && (accountNumber.length === 15)) {
        return "AmericanExpress"
    }
    // Discover
    let first3Numbers = parseInt(accountNumber.substr(0, 3));
    let first4Numbers = parseInt(accountNumber.substr(0, 4));
    let first6Numbers = parseInt(accountNumber.substr(0, 6));
    if ((first2Numbers === 65) ||
        (inRangeInclusive(first3Numbers, 644, 649)) ||
        (inRangeInclusive(first3Numbers, 644, 649)) ||
        (first4Numbers === 6011) ||
        (inRangeInclusive(first6Numbers, 622126, 622925))) {
        return "Discover"
    }
    return "Unknown"
}

function isFullCost(paymentOption, customerPrice) {
    return ((paymentOption.downpayment === customerPrice) &&
        (paymentOption.number_of_months === 0));
}

function formLender(paymentOption, customerPrice, firstPaymentDateString) {
    if (isFullCost(paymentOption, customerPrice)) {
        return null;
    } else {
        return {
            DealerPaysMBPFinanceServiceFee: true,
            DownPaymentAmount: paymentOption.downpayment,
            FirstPaymentDate: firstPaymentDateString,
            MBPFinancePlanType: numberToStringTerm(paymentOption.number_of_months)
        };
    }
}

router.post("/purchase",
    verifyVehiclePost,
    (req, res) => {
        let warrantyRequest = req.body.warrantyRequest
        let dateObj = new Date();
        warrantyRequest.date = dateObj
        let date = (dateObj.getMonth() + 1).toString() + "-" +
            dateObj.getDate().toString() + "-" +
            dateObj.getFullYear().toString();
        console.log("Purchase date: ", date, "VIN ", warrantyRequest.vin);
        let quoteResponseId = req.body.quoteResponseId;
        let planId = req.body.planId
        let customerPrice = req.body.customerPrice

            // Commented out for test purposes
        let paymentOption = req.body.paymentOption;
        let downpaymentCard = formMBPFinanceAccountPayments(paymentOption.downpaymentCard, true);
        let financeCard = formMBPFinanceAccountPayments(paymentOption.financeCard, false);
        let firstPaymentDate = new Date();
        if (paymentOption.downpaymentCard) {
          paymentOption.downpaymentCard.card_type = cardType(paymentOption.downpaymentCard.account_number);
        }
        if (paymentOption.financeCard) {
          paymentOption.financeCard.card_type = cardType(paymentOption.financeCard.account_number);
        }
        console.log("Payment Options", JSON.stringify(paymentOption));

        // firstPaymentDate.setMonth(firstPaymentDate.getMonth()+1);
        let firstPaymentDateString = firstPaymentDate.toMBPIString()
        console.log("First payment date: ", firstPaymentDateString);
        let objectToRequest = {
            Dealercode: MBPCredentials.Dealercode,
            AccountUsername: MBPCredentials.Accountusername,
            AccountPassword: MBPCredentials.AccountPassword,
            QuoteResponseID: quoteResponseId,
            VIN: warrantyRequest.vin, //"1FD7X2A66BEA98347",
            Mileage: warrantyRequest.mileage, //10,
            PurchasePrice: 10000,
            PurchaseDate: date, //"4-2-2016",
            Statustype: "used",
            IsFirstOwner: false,
            format: "json",
            Customer: {
                FirstName: warrantyRequest.first_name,
                LastName: warrantyRequest.last_name,
                Address1: warrantyRequest.address1, //"NOT defined yet",
                Address2: warrantyRequest.address2,
                City: warrantyRequest.city, //"NOT defined yet",
                StateAbbreviation: warrantyRequest.state, //"CA",
                ZipCode: warrantyRequest.zip, //"90210",
                HomePhoneNumber: warrantyRequest.phone,
                EmailAddress: warrantyRequest.email
            },
            Plans: [{
                PlanIdentifier: planId,
                CustomerPrice: customerPrice,
                Lender: formLender(paymentOption, customerPrice, firstPaymentDateString),
                MBPFinanceAccountPayments: (isFullCost(paymentOption, customerPrice) ? null : [downpaymentCard, financeCard])
            }]
        };
        console.log(JSON.stringify(objectToRequest));
        requestify.post(MBPCredentials.Server + "/api/purchasecontract.json",
            objectToRequest).then((response) => {
            // Get the response body
            let jsonBody = response.getBody();
            // console.log("Response:", jsonBody);
            console.log("Response received");
            let errors = jsonBody.Errors;
            // console.log(errors);
            if (errors !== undefined) {
                console.log(errors)
                processMBPIErrors(errors, res);
                return;
            }
            /*let warrantyJsonBody = {
              GeneratedContracts:[ {
                PlanIdentifier: "TestIddddd",
                ContractNumber: 100500100
                }
              ],
              ResponseID:"TestWarrantyResponseId"
            }*/
            let warrantyJsonBody = jsonBody;
            db.saveWarranty(warrantyJsonBody, warrantyRequest, paymentOption, (warrantyDBObject) => {
                if ((paymentOption.downpayment === req.body.customerPrice) &&
                    (paymentOption.number_of_months === 0)) {
                    console.log("Charging downpayment via Stripe");

                    chargeDownpaymentViaStripe(req, res, () => {
                        preparePurchaseResult(warrantyJsonBody.GeneratedContracts[0].ContractNumber, (json) => {
                            res.json(json);
                        });
                    }, (stripeDownpaymentError) => {
                        voidWarranty(warrantyDBObject.ResponseID,
                            warrantyDBObject.ContractNumber, () => {
                                destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, stripeDownpaymentError)
                            }, (voidWarrantyError) => {
                                destroyWarrantyDBReconrAndSendError(res, warrantyDBObject,
                                    stripeDownpaymentError + " " + voidWarrantyError)
                            })
                    }, (error) => {
                        utils.sendError(res, error);
                    })
                } else {
                    preparePurchaseResult(warrantyJsonBody.GeneratedContracts[0].ContractNumber, (json) => {
                        res.json(json);
                    });
                }
            }, (error) => {
                utils.sendError(res, error);
            });
        }).catch((err) => {
            res.json(err);
        });
    })

//Prepares contract result
//gets signaturePlaces from database so we can use them in the frontend
function preparePurchaseResult(contr, callback) {
    db.contractByNumber(contr, (warrenty) => {
        callback({
            Success: true,
            ContractNumber: contr,
            SignablePoints: JSON.parse(warrenty.signaturePlacesJSON.toString('ascii')).SignatureFields
        });
    });
}

function destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, error) {
    let contractNumber = warrantyDBObject.ContractNumber
    db.destroyWarrantyRecord(warrantyDBObject, () => {
        sendPaymentError(res, error, contractNumber);
    }, (error) => {
        sendPaymentError(res, error, contractNumber);
    });
}

function sendPaymentError(res, error, contractNumber) {
    console.log("Warranty " + contractNumber + " voided due luck of funding");
    utils.sendError(res, error);
}

function voidWarranty(purchaseResponseID, contractNumber, success, failed) {
    requestify.post(MBPCredentials.Server + "/api/purchasecontract.json", {
        Dealercode: MBPCredentials.Dealercode,
        Accountusername: MBPCredentials.Accountusername,
        AccountPassword: MBPCredentials.AccountPassword,
        PurchaseResponseID: purchaseResponseID,
        VoidContracts: [{
            ContractNumber: contractNumber,
            VoidReason: "UnableToFund"
        }]
    }).then((response) => {
        let jsonBody = response.getBody();
        // console.log(jsonBody);
        let errors = jsonBody.Errors;
        // console.log(errors);
        if (errors !== undefined) {
            let errorDescription = errors.reduce((sum, element) => {
                return sum + element.FriendlyMessage + " "
            }, "");
            console.log("Void warranty error Desc: " + errorDescription);
            failed(errorDescription);
            return;
        }
        success()
    });
}

function chargeDownpaymentViaStripe(req, res, success, failed) {
    // let stripeToken = req.body.payments.downpaymentStripeToken;
    // if (typeof stripeToken === 'undefined') {
    //   console.log("No downpayment token - no payment!");
    //   success();
    //   return;
    // }
    let chargeObj = undefined
    let downpayment = req.body.paymentOption.downpayment * 100;
    let paymentDescriptionVal = paymentDescription(req);
    let card = req.body.paymentOption.downpaymentCard;
    let warrantyRequest = req.body.warrantyRequest
    chargeObj = {
            amount: downpayment, // amount in cents, again
            currency: "usd",
            receipt_email: warrantyRequest.email,
            source: {
                exp_month: card.expiration_month,
                exp_year: card.expiration_year,
                number: card.account_number.replace(/\D/g, ""),
                object: "card",
                cvc: card.cvv
            },
            description: paymentDescriptionVal
        }
        // console.log("Payments Obj " + JSON.stringify(req.body.paymentOption));
    let charge = stripe.charges.create(chargeObj, (err, charge) => {
        if (err) {
            // The card has been declined
            console.log("card declined: ", err.raw, " for ", charge);
            // utils.sendError(res, "The card has been declined");
            failed("The card has been declined");
        } else {
            console.log("Downpayment charge succeed: ", charge);
            success();
        }
    });
}

function paymentDescription(req) {
    let warrantyRequest = req.body.warrantyRequest
    var paymentDescription = "Downpayment on warranty for " +
        warrantyRequest.first_name + " " + warrantyRequest.last_name + " (" +
        warrantyRequest.email + ")";
    return paymentDescription;
}

router.get("/plans", (req, res) => {
    let vin = req.query.vin
    if (!vin) {
        console.log("No vin provided");
        utils.sendError(res, "No vin provided");
        return;
    }
    let mileage = req.query.mileage
    if (!mileage) {
        console.log("No vin mileage");
        utils.sendError(res, "No vin mileage");
        return;
    }

    let dateObj = new Date();
    let date = dateObj.getMonth().toString() + "-" +
        dateObj.getDate().toString() + "-" +
        dateObj.getFullYear().toString();
    console.log("Purchase date: ", date, "VIN ", vin);
    requestify.get(MBPCredentials.Server + "/api/getquote.json", {
        params: {
            Dealercode: MBPCredentials.Dealercode,
            Accountusername: MBPCredentials.Accountusername,
            AccountPassword: MBPCredentials.AccountPassword,
            VIN: vin, //"1FD7X2A66BEA98347",
            Mileage: mileage, //10,
            PurchasePrice: 6000,
            PurchaseDate: date, //"4-2-2016",
            Statustype: "used",
            format: "json"
        }
    }).then((response) => {
        let jsonBody = response.getBody();
        // console.log(jsonBody);
        let errors = jsonBody.Errors;
        // console.log(errors);
        if (errors !== undefined) {
            console.log(errors)
            processMBPIErrors(errors, res);
            return;
        }
        let quoteResponseId = jsonBody.ResponseID
            // console.log(errors);
        let programs = jsonBody.Programs
            // console.log(programs)
        if (programs === undefined) {
            utils.sendError(res, "No Programs for this vehicle");
            return;
        }
        if ((programs[0] === undefined) || (programs[0].Plans === undefined)) {
            utils.sendError(res, "No Plans for this vehicle");
            return;
        }
        let allPlans = programs[0].Plans
            // console.log(allPlans);
        let plans = allPlans.reduce((sum, element) => {
            if (element.PlanTypeDescription === "PREMIUM") {
                let cost = element.DealerCost + 1000 // As agreed with Surge. TODO: move 1000 to constants
                sum.push({
                    planId: element.PlanIdentifier,
                    cost: cost, // From Surge
                    coverageMonths: element.CoverageMonths,
                    coverageMiles: element.CoverageMiles,
                    financeOptions: installmentdetails(cost, element.CoverageMonths)
                });
            }
            return sum;
        }, []);
        res.jsonp({
            plans: plans,
            planRequestId: quoteResponseId
        });
    }).catch((err) => {
        res.json(err);
    });
});

function installmentdetails(cost, coverageMonths) {
    /*
        Fiance terms depending on warranty terms
        One year  - 6 months
        Two years - 6 months and 12 months
        Three years - 12 months, 15 months, 18 months
        Four years - 12 months, 18 months, 24 months
        Five years - 12 months, 18 months, 24 months
    */
    let financeTermDict = {
        12: [6],
        24: [6, 12],
        36: [12, 15, 18],
        48: [12, 18, 24],
        60: [12, 18, 24]
    }
    let fullPayment = { // Full payment, no finance
        downpayment: cost,
        numberOfMonths: 0,
        monthlyPrice: 0
    };
    if (!(coverageMonths in financeTermDict)) {
        console.log("Warning! Finance Terms not found");
        return [fullPayment];
    }
    let financeTerms = financeTermDict[coverageMonths];
    let result = financeTerms.reduce((previous, element) => {
        let downpayment = cost * 0.1; // As argeed. TODO: make it setting
        let costToFinance = (cost - downpayment) / element;
        previous.push({
            downpayment: utils.roundToCentUp(downpayment),
            numberOfMonths: element,
            monthlyPrice: utils.roundToCentUp(costToFinance)
        });
        return previous;
    }, [fullPayment]);
    return result;
}

function processMBPIErrors(errors, res) {
    console.log("Processing: " + errors)
    let errorDescription = errors.reduce((sum, element) => {
        return sum + element.FullMessage + " "
    }, "");
    console.log("Result error Desc: " + errorDescription);
    utils.sendError(res, errorDescription);
}

var hummus = require('hummus')
var BlockReader = function(buffer) {
    this.m_buffer = buffer;
    this.m_pos = 0;
}

BlockReader.prototype.read = function(inAmount) {
    const left = m_buffer.length - m_pos
    const availiable = Math.min(inAmount, left)
    const sb = this.m_buffer.slice(this.m_pos, this.m_pos + availiable)
        // this.m_pos = this.m_pos + availiable
    let res = []
    for (var value of sb.values()) {
        res.push(value);
    }
    return value;
};

BlockReader.prototype.notEnded = function() {
    return this.m_pos < this.m_buffer.length
}

BlockReader.prototype.setPosition = function(inPosition) {
    this.m_pos = inPosition
}

BlockReader.prototype.setPositionFromEnd = function(inPosition) {
    this.m_pos = this.m_buffer.length - inPosition
}

BlockReader.prototype.skip = function(inAmount) {
    this.m_pos = this.m_pos + inAmount;
}

BlockReader.prototype.getCurrentPosition = function() {
    return this.m_pos;
};

router.get("/contract/:number", (req, res) => {
    //The number of times the user has signed the contract
    let signedPoints = req.query.SignedPoints;

    db.contractByNumber(req.params.number, (warranty) => {
        if (warranty == null)
            return res.status(404).json({
                status: 404,
                error: true,
                message: 'Cannot find contract with id "' + req.params.number + '"'
            });

        const contractBLOB = warranty.ContractDocument,
            signaturePlacesBLOB = warranty.signaturePlacesJSON;

        let customerSignature = new Buffer(warranty.customerSignature.toString('ascii'), 'base64');
        if (!customerSignature) {
            return console.log("No customer signature");
        }

        const pathPrefix = "/tmp/"
        let randStr = uuid.v4();
        let signatureJpgFilename = pathPrefix + randStr + "_sig.jpg";
        let tempPDFFilename = pathPrefix + randStr + ".pdf";

        imagemagick.convert({
            srcData: customerSignature,
            trim: true,
            format: 'JPEG',
            quality: 100 // (best) to 1 (worst)
        }, (err, convert_res) => {
            if (!contractBLOB || err) {
                console.log("err ", err);
                return res.status(404).send('Sorry, we cannot find this contract!');
            }

            let origDoc = new Buffer(contractBLOB.toString('ascii'), 'base64');
            fs.writeFileSync(tempPDFFilename, origDoc);
            fs.writeFileSync(signatureJpgFilename, convert_res);

            let signaturePlaces = JSON.parse(signaturePlacesBLOB.toString('ascii'));
            let writer = hummus.createWriterToModify(tempPDFFilename);

            //Add Logo
            var pageModifier ;/*= new hummus.PDFPageModifier(writer, 0);
            pageModifier.startContext().getContext().drawImage(
                460, 680, path.resolve(__dirname) + '/logo.jpg', {
                    transformation: {
                        width: 80,
                        height: 80,
                        proportional: true,
                        fit: "always",
                    }
                });
            pageModifier.endContext().writePage();*/

            //Add signatures
            let runs = 0;
            signaturePlaces.SignatureFields.forEach((elem) => {
                if (elem.Name !== 'BuyerSignature') return;
                else if (runs > signedPoints - 1) return;
                else runs += 1;

                console.log("Signature Place: ", elem);

                pageModifier = new hummus.PDFPageModifier(writer, elem.PageNumber - 1);
                pageModifier.startContext().getContext().drawImage(
                    elem.XCoordinate, elem.YCoordinate, signatureJpgFilename, {
                        transformation: {
                            width: elem.Width,
                            height: elem.Height,
                            proportional: true,
                            fit: "always",
                        }
                    });
                pageModifier.endContext().writePage();
            });
            writer.end();

            var pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(res), {
                log: './MY_LOG_FILE'
            });
            pdfWriter.appendPDFPagesFromPDF(tempPDFFilename);
            pdfWriter.end();
            res.end();
            fs.removeSync(signatureJpgFilename);
            fs.removeSync(tempPDFFilename);
        }) // imagemagick
    })
})

router.post('/flow/completed', (req, res) => {
    let user = req.body,
        emailjs = require('./controllers/email.js');

    emailjs.sendEmail('purchase', 'YOUR FORCEFIELD HAS BEEN ACTIVATED', {
        name: user.first_name + ' ' + user.last_name,
        email: user.email
    }, {
        full_name: (user.first_name + ' ' + user.last_name).toUpperCase(),
        contract_url: 'https://illdrive.it/api/warranty/contract/' + user.contract_id + '?SignedPoints=999',
        receipt_url: 'https://illdrive.it/forcefield/receipt/#' + user.contract_id,
		    email: user.email
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

        console.log('Email sent to ' + user.email);
    });
});

router.get('/receipt/:number', (req, res) => {
    db.contractByNumber(req.params.number, (warranty) => {
        if (!warranty) {
        utils.sendError(res, "Can't find contract"); return;
        }
        decodeVin(warranty.vin, (vinDecodeResult) => {
        let year = vinDecodeResult.years.reduce((previous, elem) => {
            return Math.max(elem.year, previous);
        }, 0);
        let model = vinDecodeResult.model.name
        let make = vinDecodeResult.make.name
        let city = require('cities').zip_lookup(warranty.zip).city;
        res.jsonp({
            vin: warranty.vin,
            first_name: warranty.firstName,
            last_name: warranty.lastName,
            address1: warranty.address1,
            address2: warranty.address2,
            city: city,
            state: warranty.state,
            zip: warranty.zip,
            year: year,
            make: make,
            model: model,
            mileage: warranty.mileage,
            coverage_years: warranty.coverage_years,
            coverage_miles: warranty.coverage_miles,
            downpayment: warranty.downpayment,
            monthly_payment: warranty.monthly_payment,
            number_of_months: warranty.number_of_months,
            downpayment_card: warranty.downpayment_card,
            finance_payment_card: warranty.finance_payment_card,
            downpayment_card_type: warranty.downpayment_card_type,
            finance_payment_card_type: warranty.finance_payment_card_type
        })
        },(error) => {
        utils.sendError(res, "Can't decode vin")
        } )
    }, (error) => {
        utils.sendError(res, "Can't find contract")
    })
});

module.exports.router = router;
