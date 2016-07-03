var express = require('express');
var db = require('./db.js')
var utils = require('./utilities.js');
var path = require('path');
var requestify = require('requestify');
var uuid = require('node-uuid');
var zipValidator = require('./zip_validation.js')

var stripeWarrantyApiKeyProduction = "ENTER_HERE_YOUR_PRODUCTION_KEY"
var stripeWarrantyApiKeyTesting = "sk_test_nPr0hqYbXY4wc1STkZvKukWX"
var stripe = require('stripe')(stripeWarrantyApiKeyTesting);

var MBPCredentials = {
  Server: "http://testdealerservices.mbpnetwork.com",
  Dealercode:"012065",
  Accountusername:"tirekickers",
  AccountPassword:"WERQ890XcvzYD!",
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
    utils.sendError(res, "wrong mileage"); return;
  }
  if (typeof zip !== 'string') {
    utils.sendError(res, "wrong zip"); return;
  }
  if (typeof vin !== 'string') {
    utils.sendError(res, "wrong vin"); return;
  }
  db.addZIP(zip, vin, ()=> {
    zipValidator.validateZIP(zip, (isZipValid)=> {
        res.jsonp({zipValid: isZipValid, mileageValid:(mileage<=36000)}); return;
    })
  }, (error) => {
    res.jsonp({valid: false, error: error }); return;
  });
})

router.post("/emailtonotify", (req, res) => {
  let vin = req.body.vin;
  let email = req.body.email;
  if (typeof email !== 'string') {
    utils.sendError(res, "wrong email"); return;
  }
  if (typeof vin !== 'string') {
    utils.sendError(res, "wrong vin"); return;
  }
  db.addEmailForNotification(email, vin, ()=> {
    res.jsonp({result: "success"}); return;
  }, (error) => {
    utils.sendError(res, error); return;
  });

})


function verifyVehiclePost(req, res, next) {
   if ( (req.body.warrantyRequest === undefined) ||
        (req.body.warrantyRequest === null)) {
           utils.sendError(res, "warrantyRequest field not defined");
   }
   if (! Boolean(req.body.quoteResponseId)) {
     utils.sendError(res, "No quoteResponseId"); return;
   }
   if ((req.body.planId === undefined) || (req.body.planId === null)) {
     utils.sendError(res, "No planId"); return;
   }
   if (! Boolean(req.body.customerPrice)) {
     utils.sendError(res, "No customerPrice"); return;
   }
   let warrantyRequest = req.body.warrantyRequest;
   if (! Boolean(warrantyRequest.vin)) {
     utils.sendError(res, "No warrantyRequest.vin"); return;
   }
   if (! Boolean(warrantyRequest.mileage)) {
     utils.sendError(res, "No warrantyRequest.mileage"); return;
   }
   if (! Boolean(warrantyRequest.first_name)) {
     utils.sendError(res, "No warrantyRequest.first_name"); return;
   }
   if (! Boolean(warrantyRequest.last_name)) {
     utils.sendError(res, "No warrantyRequest.last_name"); return;
   }
   if (! Boolean(warrantyRequest.address1)) {
     utils.sendError(res, "No warrantyRequest.address1"); return;
   }
   if (! Boolean(warrantyRequest.city)) {
     utils.sendError(res, "No warrantyRequest.city"); return;
   }
   if (! Boolean(warrantyRequest.state)) {
     utils.sendError(res, "No warrantyRequest.state"); return;
   }
   if (! Boolean(warrantyRequest.zip)) {
     utils.sendError(res, "No warrantyRequest.zip"); return;
   }
   if (! Boolean(warrantyRequest.phone)) {
     utils.sendError(res, "No warrantyRequest.phone"); return;
   }
   if (! Boolean(warrantyRequest.email)) {
     utils.sendError(res, "No warrantyRequest.email"); return;
   }
   if (! Boolean(req.body.paymentOption)) {
     utils.sendError(res, "No paymentOption"); return;
   }
   if (! Boolean(req.body.paymentOption.downpayment)) {
     utils.sendError(res, "No paymentOption.downpayment"); return;
   }
   if ((req.body.paymentOption.number_of_months === undefined) ||
       (req.body.paymentOption.number_of_months === null) ) {
     utils.sendError(res, "No paymentOption.number_of_months"); return;
   }
   if (! Boolean(req.body.paymentOption.downpaymentCard)) {
     utils.sendError(res, "No paymentOption.downpaymentCard"); return;
   }
   if (! Boolean(req.body.paymentOption.financeCard)) {
     utils.sendError(res, "No paymentOption.financeCard"); return;
   }
   let downpaymentCardError = checkCardDataPresent(req.body.paymentOption.downpaymentCard, "downpaymentCard");
   if ( Boolean(downpaymentCardError) ) {
     utils.sendError(res, downpaymentCardError); return;
   }
   let financeCardError = checkCardDataPresent(req.body.paymentOption.financeCard, "financeCard");
   if ( Boolean(financeCardError) ) {
     utils.sendError(res, financeCardError); return;
   }

   next();
}

function checkCardDataPresent(card, type) {
  if (! Boolean(card.account_number)) {
    return "No "+type+".account_number";
  }
  if (! Boolean(card.cardholder_name)) {
    return "No "+type+".cardholder_name";
  }
  if (! Boolean(card.expiration_month)) {
    return "No "+type+".expiration_month";
  }
  if (! Boolean(card.expiration_year)) {
    return "No "+type+".expiration_year";
  }
}

Date.prototype.toMBPIString = function() {
  let dateStr = (this.getMonth()+1).toString()+"-"+
    this.getDate().toString()+"-"+
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
    CreditCardType: cardType(internalPayment.account_number),
    CardHolderName: internalPayment.cardholder_name,
    AccountNumber: internalPayment.account_number, // Card number
    ExpirationMonth: internalPayment.expiration_month,
    ExpirationYear: internalPayment.expiration_year,
    UseForDownPayment: isDownpayment,
    UseForMonthlyPayment: !isDownpayment
  }
  return res
}

function cardType(accountNumber) {
  function inRangeInclusive (value, start, end) {
    return ((value >= start) && (value <= end))
  }
  //TODO: actual check
  let visaLengths = new Set([13, 16, 19]);
  // console.log("A/N:\"",accountNumber,"\" length ", accountNumber.length,
 // "starts ", accountNumber.startsWith("4"), " in ", (accountNumber.length in [13, 16, 19]) );
  if (accountNumber.startsWith("4") && (visaLengths.has(accountNumber.length))) {
    return "Visa"
  }
  let first2Numbers =  parseInt(accountNumber.substr(0,2));
  if (inRangeInclusive(first2Numbers,51,55) && (accountNumber.length === 16)) {
    return "MasterCard"
  }
  if ((first2Numbers in [34,37]) && (accountNumber.length === 15)) {
    return "AmericanExpress"
  }
  // Discover
  let first3Numbers =  parseInt(accountNumber.substr(0,3));
  let first4Numbers =  parseInt(accountNumber.substr(0,4));
  let first6Numbers =  parseInt(accountNumber.substr(0,6));
  if ((first2Numbers === 65) ||
      (inRangeInclusive(first3Numbers, 644, 649)) ||
      (inRangeInclusive(first3Numbers, 644, 649)) ||
      ( first4Numbers === 6011) ||
      (inRangeInclusive(first6Numbers, 622126,622925))) {
      return  "Discover"
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
      DealerPaysMBPFinanceServiceFee: false,
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
  let date = (dateObj.getMonth()+1).toString()+"-"+
    dateObj.getDate().toString()+"-"+
    dateObj.getFullYear().toString();
  console.log("Purchase date: ", date, "VIN ", warrantyRequest.vin);
  let quoteResponseId = req.body.quoteResponseId;
  let planId = req.body.planId
  let customerPrice = req.body.customerPrice
  // Commented out for test purposes
  let paymentOption = req.body.paymentOption;
  let downpaymentCard = formMBPFinanceAccountPayments(paymentOption.downpaymentCard, true);
  let financeCard = formMBPFinanceAccountPayments(paymentOption.financeCard, false);
  let firstPaymentDate = new Date() ;
  // firstPaymentDate.setMonth(firstPaymentDate.getMonth()+1);
  let firstPaymentDateString = firstPaymentDate.toMBPIString()
  console.log("First payment date: ", firstPaymentDateString);
  let objectToRequest = {
    Dealercode: MBPCredentials.Dealercode,
    AccountUsername: MBPCredentials.Accountusername,
    AccountPassword: MBPCredentials.AccountPassword,
    QuoteResponseID: quoteResponseId,
    VIN:warrantyRequest.vin, //"1FD7X2A66BEA98347",
    Mileage:warrantyRequest.mileage, //10,
    PurchasePrice:10000,
    PurchaseDate:date, //"4-2-2016",
    Statustype:"used",
    IsFirstOwner: false,
    format:"json",
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
      MBPFinanceAccountPayments: (isFullCost(paymentOption,customerPrice) ? null : [downpaymentCard, financeCard])
    }]
  };
  console.log(JSON.stringify(objectToRequest));
  requestify.post(MBPCredentials.Server + "/api/purchasecontract.json",
   objectToRequest).then( (response) => {
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
    db.saveWarranty(warrantyJsonBody, warrantyRequest, (warrantyDBObject) => {
      if ((paymentOption.downpayment === req.body.customerPrice) &&
        (paymentOption.number_of_months === 0)) {
        console.log("Charging downpayment via Stripe");
        chargeDownpaymentViaStripe(req, res, () => {
          res.send(warrantyJsonBody);
        }, (stripeDownpaymentError) => {
          voidWarranty(warrantyDBObject.ResponseID,
             warrantyDBObject.ContractNumber, () => {
               destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, stripeDownpaymentError)
             }, (voidWarrantyError) => {
               destroyWarrantyDBReconrAndSendError(res, warrantyDBObject,
                  stripeDownpaymentError+" "+voidWarrantyError)
             })
      }, (error) => {
        utils.sendError(res, error);
      })
      } else {
        res.send(warrantyJsonBody);
      }
    }, (error) => {
      utils.sendError(res, error);
    });
  });
})

function destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, error) {
  let contractNumber = warrantyDBObject.ContractNumber
  db.destroyWarrantyRecord(warrantyDBObject, () =>{
     sendPaymentError(res, error, contractNumber);
  }, (error) => {
    sendPaymentError(res, error, contractNumber);
  });
}

function sendPaymentError(res, error, contractNumber) {
  console.log("Warranty "+contractNumber + " voided due luck of funding");
  utils.sendError(res, error);
}

function voidWarranty (purchaseResponseID, contractNumber, success, failed) {
  requestify.post(MBPCredentials.Server + "/api/purchasecontract.json", {
    Dealercode: MBPCredentials.Dealercode,
    Accountusername: MBPCredentials.Accountusername,
    AccountPassword: MBPCredentials.AccountPassword,
    PurchaseResponseID: purchaseResponseID,
    VoidContracts: [{
      ContractNumber: contractNumber,
      VoidReason: "UnableToFund"
    }]
  }).then( (response) => {
    let jsonBody = response.getBody();
    // console.log(jsonBody);
    let errors = jsonBody.Errors;
    // console.log(errors);
    if (errors !== undefined) {
      let errorDescription = errors.reduce((sum, element) => {
        return sum + element.FriendlyMessage+ " "
      }, "");
      console.log("Void warranty error Desc: " + errorDescription);
      failed(errorDescription); return;
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
  let downpayment = req.body.paymentOption.downpayment*100;
  let paymentDescriptionVal = paymentDescription(req);
  let card = req.body.paymentOption.downpaymentCard;
  chargeObj = {
    amount: downpayment, // amount in cents, again
    currency: "usd",
    source: {
       exp_month:card.expiration_month,
       exp_year:card.expiration_year,
        number:card.account_number,
         object: "card",
          cvc: card.cvv
    },
    description: paymentDescriptionVal
  }
  // console.log("Payments Obj " + JSON.stringify(req.body.paymentOption));
  let charge = stripe.charges.create(chargeObj, (err, charge) => {
    if (err) {
      // The card has been declined
      console.log("card declined: ",err.raw, " for ", charge );
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
  // For test purposes
  /*
  res.jsonp({"plans":[{"planId":"28ee194c-736b-48f7-aef9-39440d85db19","cost":1657,"coverageMonths":24,"coverageMiles":40000,"financeOptions":[{"downpayment":1657,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":173.2,"numberOfMonths":6,"monthlyPrice":259.8},{"downpayment":176.7,"numberOfMonths":12,"monthlyPrice":132.53}]},{"planId":"94146fae-86a4-4e1b-aec0-996d9e494153","cost":2022,"coverageMonths":48,"coverageMiles":75000,"financeOptions":[{"downpayment":2022,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":213.2,"numberOfMonths":12,"monthlyPrice":159.9},{"downpayment":219.2,"numberOfMonths":18,"monthlyPrice":109.6},{"downpayment":227.2,"numberOfMonths":24,"monthlyPrice":85.2}]},{"planId":"9be3e2f6-a2e4-4147-8cd2-fd99e372f2a7","cost":2318,"coverageMonths":48,"coverageMiles":100000,"financeOptions":[{"downpayment":2318,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":242.8,"numberOfMonths":12,"monthlyPrice":182.1},{"downpayment":248.8,"numberOfMonths":18,"monthlyPrice":124.4},{"downpayment":256.8,"numberOfMonths":24,"monthlyPrice":96.3}]},{"planId":"56ab93a9-f8f0-48ec-8d51-3ce4f1c9d1e3","cost":2083,"coverageMonths":60,"coverageMiles":75000,"financeOptions":[{"downpayment":2083,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":219.3,"numberOfMonths":12,"monthlyPrice":164.48},{"downpayment":225.3,"numberOfMonths":18,"monthlyPrice":112.65},{"downpayment":233.3,"numberOfMonths":24,"monthlyPrice":87.49}]},{"planId":"7ea237c1-256d-453f-9932-5fffa38cd65e","cost":2399,"coverageMonths":60,"coverageMiles":100000,"financeOptions":[{"downpayment":2399,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":250.9,"numberOfMonths":12,"monthlyPrice":188.18},{"downpayment":256.91,"numberOfMonths":18,"monthlyPrice":128.45},{"downpayment":264.91,"numberOfMonths":24,"monthlyPrice":99.34}]},{"planId":"85bae00f-11e3-458b-b7b6-cd06cd38f1c2","cost":1794,"coverageMonths":36,"coverageMiles":60000,"financeOptions":[{"downpayment":1794,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":190.4,"numberOfMonths":12,"monthlyPrice":142.8},{"downpayment":193.9,"numberOfMonths":15,"monthlyPrice":116.34},{"downpayment":196.4,"numberOfMonths":18,"monthlyPrice":98.2}]},{"planId":"789a2d74-d9a5-4f25-91a0-1ab0af8484ca","cost":1896,"coverageMonths":36,"coverageMiles":75000,"financeOptions":[{"downpayment":1896,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":200.61,"numberOfMonths":12,"monthlyPrice":150.46},{"downpayment":204.11,"numberOfMonths":15,"monthlyPrice":122.46},{"downpayment":206.61,"numberOfMonths":18,"monthlyPrice":103.31}]},{"planId":"26d978d5-240b-4add-9d4e-469dd8feb7f2","cost":2232,"coverageMonths":36,"coverageMiles":100000,"financeOptions":[{"downpayment":2232,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":234.2,"numberOfMonths":12,"monthlyPrice":175.65},{"downpayment":237.7,"numberOfMonths":15,"monthlyPrice":142.62},{"downpayment":240.2,"numberOfMonths":18,"monthlyPrice":120.1}]}],"planRequestId":"975c0101-775e-4aa8-8bed-a7daf758dac2"});
  return;
  */
  let vin = req.query.vin
  if (! vin ) {
    console.log("No vin provided");
    utils.sendError(res, "No vin provided"); return;
  }
  let mileage = req.query.mileage
  if (! mileage ) {
    console.log("No vin mileage");
    utils.sendError(res, "No vin mileage"); return;
  }

  let dateObj = new Date();
  let date = dateObj.getMonth().toString()+"-"+
    dateObj.getDate().toString()+"-"+
    dateObj.getFullYear().toString();
    console.log("Purchase date: ", date, "VIN ", vin);
    requestify.get(MBPCredentials.Server + "/api/getquote.json", {
      params: {
      Dealercode: MBPCredentials.Dealercode,
      Accountusername: MBPCredentials.Accountusername,
      AccountPassword: MBPCredentials.AccountPassword,
      VIN: vin, //"1FD7X2A66BEA98347",
      Mileage:mileage, //10,
      PurchasePrice:6000,
      PurchaseDate:date, //"4-2-2016",
      Statustype:"used",
      format:"json"
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
      res.jsonp({plans: plans, planRequestId:quoteResponseId});
    });
});

function installmentdetails(cost, coverageMonths) {
  let feesDict = { // maps installment duration to fee price
    6: 75,
    12: 110,
    15: 145,
    18: 170,
    24: 250
  }
  /* Fiance terms depending on warranty terms
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
    if (!(element in feesDict)) return previous;
    let fee = feesDict[element];
    let totalCost = cost+fee; // Fee should be included to all costs
    let downpayment  = totalCost * 0.1 ; // As argeed. TODO: make it setting
    let costToFinance = (totalCost-downpayment)/element;
    previous.push({
      downpayment    : utils.roundToCentUp(downpayment),
      numberOfMonths : element,
      monthlyPrice   : utils.roundToCentUp(costToFinance)
    });
    return previous;
  }, [fullPayment]);
  return result;
}

function processMBPIErrors (errors, res) {
  console.log("Processing: " + errors)
  let errorDescription = errors.reduce((sum, element) => {
    return sum + element.FullMessage+ " "
  }, "");
  console.log("Result error Desc: " + errorDescription);
  utils.sendError(res, errorDescription);
}

module.exports.router = router;
