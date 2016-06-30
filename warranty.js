var express = require('express');
var db = require('./db.js')
var utils = require('./utilities.js');
var path = require('path');
var requestify = require('requestify');
var uuid = require('node-uuid');

var stripeWarrantyApiKeyProduction = "ENTER_HERE_YOUR_PRODUCTION_KEY"
var stripeWarrantyApiKeyTesting = "sk_test_nPr0hqYbXY4wc1STkZvKukWX"
var stripe = require('stripe')(stripeWarrantyApiKeyTesting);

var MBPCredentials = {
  Server: "http://testdealerservices.mbpnetwork.com",
  Dealercode:"001066",
  Accountusername:"tirekickers",
  AccountPassword:"WERQ890XcvzYD!",
}

var router = express.Router();
router.get("/", (req, res) => {
  res.send("Hello from warranty")
});

function verifyVehiclePost(req, res, next) {
   if ( (req.body.inspectionRequest === undefined) ||
        (req.body.inspectionRequest === null)) {
           utils.sendError(res, "inspectionRequest field not defined");
   }
   if ((req.body.planId === undefined) || (req.body.planId === null)) {
     utils.sendError(res, "No planId"); return;
   }
   if ((req.body.customerPrice === undefined) || (customerPrice === null)) {
     utils.sendError(res, "No customerPrice"); return;
   }
   if (! Boolean(req.body.inspectionRequest.vin)) {
     utils.sendError(res, "No inspectionRequest.vin"); return;
   }
   if (! Boolean(inspectionRequest.first_name)) {
     utils.sendError(res, "No inspectionRequest.first_name"); return;
   }
   if (! Boolean(inspectionRequest.last_name)) {
     utils.sendError(res, "No inspectionRequest.last_name"); return;
   }
   if (! Boolean(inspectionRequest.address1)) {
     utils.sendError(res, "No inspectionRequest.address1"); return;
   }
   if (! Boolean(inspectionRequest.city)) {
     utils.sendError(res, "No inspectionRequest.city"); return;
   }
   if (! Boolean(inspectionRequest.state)) {
     utils.sendError(res, "No inspectionRequest.state"); return;
   }
   if (! Boolean(inspectionRequest.zip)) {
     utils.sendError(res, "No inspectionRequest.zip"); return;
   }
   if (! Boolean(inspectionRequest.phone)) {
     utils.sendError(res, "No inspectionRequest.phone"); return;
   }
   if (! Boolean(inspectionRequest.email)) {
     utils.sendError(res, "No inspectionRequest.email"); return;
   }
   if (! Boolean(req.body.payments.downpaymentStripeToken)) {
     utils.sendError(res, "No payments.downpaymentStripeToken"); return;
   }
   if (! Boolean(req.body.payments.installmentStripeToken)) {
     utils.sendError(res, "No payments.installmentStripeToken"); return;
   }
   if (! Boolean(req.body.payments.monthlyPayment)) {
     utils.sendError(res, "No payments.monthlyPayment"); return;
   }
   if (! Boolean(req.body.payments.numberOfMonths)) {
     utils.sendError(res, "No payments.numberOfMonths"); return;
   }

   next();
}

router.post("/purchase",
       verifyVehiclePost,
       (req, res) => {
  let inspectionRequest = req.body.inspectionRequest
  let dateObj = new Date();
  inspectionRequest.date = dateObj
  let date = (dateObj.getMonth()+1).toString()+"-"+
    dateObj.getDate().toString()+"-"+
    dateObj.getFullYear().toString();
  console.log("Purchase date: ", date, "VIN ", inspectionRequest.vin);
  let queryResponseId = req.body.queryResponseId;
  if (queryResponseId === undefined) {
    utils.sendError(res, "No QueryResponseId"); return;
  }
  let planId = req.body.planId
  let customerPrice = req.body.customerPrice
  // Commented out for test purposes

  requestify.post(MBPCredentials.Server + "/api/purchasecontract.json", {
    Dealercode: MBPCredentials.Dealercode,
    Accountusername: MBPCredentials.Accountusername,
    AccountPassword: MBPCredentials.AccountPassword,
    QuoteResponseID: queryResponseId,
    VIN:inspectionRequest.vin, //"1FD7X2A66BEA98347",
    Mileage:inspectionRequest.mileage, //10,
    PurchasePrice:6000,
    PurchaseDate:date, //"4-2-2016",
    Statustype:"used",
    IsFirstOwner: false,
    format:"json",
    Customer: {
      FirstName: inspectionRequest.first_name,
      LastName: inspectionRequest.last_name,
      Address1: inspectionRequest.address1, //"NOT defined yet",
      Address2: inspectionRequest.address2,
      City: inspectionRequest.city, //"NOT defined yet",
      StateAbbreviation: inspectionRequest.state, //"CA",
      ZipCode: inspectionRequest.zip, //"90210",
      HomePhoneNumber: inspectionRequest.phone,
      EmailAddress: inspectionRequest.email,
    },
    Plans: [{
      PlanIdentifier: planId,
      CustomerPrice: customerPrice
    }]
  }).then( (response) => {
    // Get the response body
    let jsonBody = response.getBody();
    // console.log(jsonBody);
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
    db.saveWarranty(warrantyJsonBody, inspectionRequest, (warrantyDBObject) => {
      createInstallmentPlanViaStripe(req, res, warrantyDBObject, (subscription) => {
        if (subscription!== undefined ) {
          req.body.subscriptionCustomer = subscription.customer
        }
        chargeDownpaymentViaStripe(req, res, () => {
          res.send(warrantyJsonBody);
        }, (stripeDownpaymentError) => {
          if (subscription) {
          deleteSubscriptionRecursivelly(subscription.id, () => {
            voidWarranty(warrantyDBObject.ResponseID,
               warrantyDBObject.ContractNumber, () => {
                 destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, stripeDownpaymentError)
               }, (voidWarrantyError) => {
                 destroyWarrantyDBReconrAndSendError(res, warrantyDBObject,
                    stripeDownpaymentError+" "+voidWarrantyError)
               })
          })
        }  else { // if no subscription
          let contractNumber = warrantyDBObject.ContractNumber
          voidWarranty(warrantyDBObject.ResponseID,
             contractNumber, () => {
               destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, stripeDownpaymentError)
          }, (voidWarrantyError) => {
            destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, stripeDownpaymentError)
          })
        }
        })
      }, (installmentPlanError) => {
        // TODO: Void warranty here
        voidWarranty(warrantyDBObject.ResponseID,
           warrantyDBObject.ContractNumber, () => {
             destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, installmentPlanError)
        }, (voidWarrantyError) => {
          destroyWarrantyDBReconrAndSendError(res, warrantyDBObject, stripeDownpaymentError)
        })
      })
      // Commented out for test purposes
    }, (error) => {
      utils.sendError(res, error);
    })
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
  let stripeToken = req.body.payments.downpaymentStripeToken;
  if (typeof stripeToken === 'undefined') {
    console.log("No downpayment token - no payment!");
    success();
    return;
  }
  let chargeObj = undefined
  let downpayment = req.body.payments.downpayment;
  let paymentDescriptionVal = paymentDescription(req);
  if ((req.body.payments.monthlyPayment !==0 ) &&
      (req.body.payments.installmentStripeToken === stripeToken) ) {
    // Use created customer in this case because Stripe token cannot be used twice
    chargeObj = {
      amount: downpayment, // amount in cents, again
      currency: "usd",
      customer: req.body.subscriptionCustomer,
      description: paymentDescriptionVal
    };
  } else {
    chargeObj = {
      amount: downpayment, // amount in cents, again
      currency: "usd",
      source: stripeToken,
      description: paymentDescriptionVal
    };
  }
  console.log("Payments Obj " + JSON.stringify(req.body.payments));
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

function createInstallmentPlanViaStripe(req, res, warrantyDBObject, success, failed) {
  console.log("Payments Obj " + JSON.stringify(req.body.payments));
  let monthlyPayment = req.body.payments.monthlyPayment;
  if (monthlyPayment === 0) { success(undefined); return; }
  let numberOfMonths = req.body.payments.numberOfMonths;
  let stripeToken = req.body.payments.installmentStripeToken;
  if (typeof stripeToken === 'undefined') {
    let errorStr = "No installmentStripeToken token - no installment!"
    console.log(errorStr);
    failed(errorStr);
    return;
  }
  let paymentDescriptionVal = installmentPaymentDescription(req);
  let planName = "$" + monthlyPayment/100 +
          "x" + numberOfMonths +" months"
  let planId = uuid.v4();
  createSubscriptionPlan(monthlyPayment, planName, planId, (plan) => {
    createCustomer(stripeToken, paymentDescriptionVal,
       req.body.inspectionRequest.email, (customer) => {
         createSubscription(plan.id, customer.id, (subscription) => {
           warrantyDBObject.installmentPlanId = subscription.id;
           warrantyDBObject.periodsToCancel = numberOfMonths;
           warrantyDBObject.save().then( (warrantyDBObject) => {
              success(subscription);
           }, (error) => {
             console.log("Cannot store subscription into DB");
             deleteSubscriptionRecursivelly(subscription.id, () => {
               failed("Cannot store subscription in DB: " + error);
               return;
             })
           })

         }, (error) => {
           stripe.customers.del(customer.id, (err, confirmation) => {
             // Does not really need to check customer deletion result
             stripe.plans.del(planId, (err, confirmation) => {
               // Does not really need to check plan deletion result
               let errorText = "Cannot create the customer! (" + error + ")"
               console.log(errorText);
               failed(errorText);
             });
           })
         })
    }, (error) => {
         stripe.plans.del(planId, (err, confirmation) => {
           // Does not really need to check plan deletion
           let errorText = "Cannot create the customer! (" + error + ")"
           console.log(errorText);
           failed(errorText);
         });
       } );
  }, (error) => {
    let errorText = "Cannot create the subscription plan! (" + error + ")"
    console.log(errorText);
    failed(errorText)
  });
}

function createCustomer(source, description, email, success, failed) {
  stripe.customers.create({
    description: description,
    email: email,
    source: source
  }, (err, customer) => {
    if (err) { failed(err.raw); return; }
    success(customer);
  });
}

function createSubscriptionPlan(chargeAmount, planName, planId, success, failed ) {
  stripe.plans.create({
    amount: chargeAmount,
    interval: "day",//"month", // Should be month in production
    name: planName,
    currency: "usd",
    id: planId,
    trial_period_days : 1 // Should be 30 in production
  }, (err, plan) => {
    if (err) { failed(err.raw); return; }
    success(plan);
  });
}

function createSubscription(planId, customerId, success, failed) {
  stripe.subscriptions.create({
    customer: customerId,
    plan: planId
    // ,  trial_end: 0  // May be use it for tests?
  }, (err, subscription) => {
      if (err) { failed(err.raw); return; }
      success(subscription);
    }
  );
}

function deleteSubscriptionRecursivelly(subscriptionId, finished) {
    stripe.subscriptions.del(subscriptionId, (subscriptionserr, subscription) => {
      if (subscriptionserr) {
        console.log("Error removing subscription: ", subscriptionserr.raw);
        finished(); return;
      }
      stripe.customers.del(subscription.customer, (customererr, confirmation) => {
        // Does not really need to check customer deletion result
        if (customererr) {
          console.log("Error removing customer: ", customererr.raw);
          finished(); return;
        }
        stripe.plans.del(subscription.plan.id, (planserr, confirmation) => {
          // Does not really need to check plan deletion result
          if (planserr) {
            console.log("Error removing subscription plan: ", planserr.raw);
          }
          finished();
        });
      })
    });
}


function paymentDescription(req) {
  let inspectionRequest = req.body.inspectionRequest
  var paymentDescription = "Downpayment on warranty of " +
   inspectionRequest.make + " " + inspectionRequest.model + " for " +
   inspectionRequest.first_name + " " + inspectionRequest.last_name + " (" +
   inspectionRequest.email + ")";
   return paymentDescription;
}

function installmentPaymentDescription(req) {
  let inspectionRequest = req.body.inspectionRequest
  var paymentDescription = /*"Installment on warranty of " +
   inspectionRequest.make + " " + inspectionRequest.model + " for " +*/
   inspectionRequest.first_name + " " + inspectionRequest.last_name + " (" +
   inspectionRequest.email + ") subscription";
   return paymentDescription;
}

router.get("/plans", (req, res) => {
  // For test purposes
  /*
  res.json({"plans":[{"planId":"28ee194c-736b-48f7-aef9-39440d85db19","cost":1657,"coverageMonths":24,"coverageMiles":40000,"financeOptions":[{"downpayment":1657,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":173.2,"numberOfMonths":6,"monthlyPrice":259.8},{"downpayment":176.7,"numberOfMonths":12,"monthlyPrice":132.53}]},{"planId":"94146fae-86a4-4e1b-aec0-996d9e494153","cost":2022,"coverageMonths":48,"coverageMiles":75000,"financeOptions":[{"downpayment":2022,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":213.2,"numberOfMonths":12,"monthlyPrice":159.9},{"downpayment":219.2,"numberOfMonths":18,"monthlyPrice":109.6},{"downpayment":227.2,"numberOfMonths":24,"monthlyPrice":85.2}]},{"planId":"9be3e2f6-a2e4-4147-8cd2-fd99e372f2a7","cost":2318,"coverageMonths":48,"coverageMiles":100000,"financeOptions":[{"downpayment":2318,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":242.8,"numberOfMonths":12,"monthlyPrice":182.1},{"downpayment":248.8,"numberOfMonths":18,"monthlyPrice":124.4},{"downpayment":256.8,"numberOfMonths":24,"monthlyPrice":96.3}]},{"planId":"56ab93a9-f8f0-48ec-8d51-3ce4f1c9d1e3","cost":2083,"coverageMonths":60,"coverageMiles":75000,"financeOptions":[{"downpayment":2083,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":219.3,"numberOfMonths":12,"monthlyPrice":164.48},{"downpayment":225.3,"numberOfMonths":18,"monthlyPrice":112.65},{"downpayment":233.3,"numberOfMonths":24,"monthlyPrice":87.49}]},{"planId":"7ea237c1-256d-453f-9932-5fffa38cd65e","cost":2399,"coverageMonths":60,"coverageMiles":100000,"financeOptions":[{"downpayment":2399,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":250.9,"numberOfMonths":12,"monthlyPrice":188.18},{"downpayment":256.91,"numberOfMonths":18,"monthlyPrice":128.45},{"downpayment":264.91,"numberOfMonths":24,"monthlyPrice":99.34}]},{"planId":"85bae00f-11e3-458b-b7b6-cd06cd38f1c2","cost":1794,"coverageMonths":36,"coverageMiles":60000,"financeOptions":[{"downpayment":1794,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":190.4,"numberOfMonths":12,"monthlyPrice":142.8},{"downpayment":193.9,"numberOfMonths":15,"monthlyPrice":116.34},{"downpayment":196.4,"numberOfMonths":18,"monthlyPrice":98.2}]},{"planId":"789a2d74-d9a5-4f25-91a0-1ab0af8484ca","cost":1896,"coverageMonths":36,"coverageMiles":75000,"financeOptions":[{"downpayment":1896,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":200.61,"numberOfMonths":12,"monthlyPrice":150.46},{"downpayment":204.11,"numberOfMonths":15,"monthlyPrice":122.46},{"downpayment":206.61,"numberOfMonths":18,"monthlyPrice":103.31}]},{"planId":"26d978d5-240b-4add-9d4e-469dd8feb7f2","cost":2232,"coverageMonths":36,"coverageMiles":100000,"financeOptions":[{"downpayment":2232,"numberOfMonths":0,"monthlyPrice":0},{"downpayment":234.2,"numberOfMonths":12,"monthlyPrice":175.65},{"downpayment":237.7,"numberOfMonths":15,"monthlyPrice":142.62},{"downpayment":240.2,"numberOfMonths":18,"monthlyPrice":120.1}]}],"planRequestId":"975c0101-775e-4aa8-8bed-a7daf758dac2"});
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
      let queryResponseId = jsonBody.ResponseID
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
      res.json({plans: plans, planRequestId:queryResponseId});
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

/// Stripe callbacks

router.post("/stripecallback", checkIfRightMode, checkEvent,
 // refetchEvent, // production only
 (req, res) => {
   // TODO: find a way to make this call idempotent.
   // May be store last payment time and compare values
  let event = req.body;
  console.log("Stripe callback: ", event);
  let invoice = event.data.object
  if ((invoice === undefined) || (invoice === null)) {
    console.log("No invoice found");
    res.sendStatus(200);
    return;
  }
  let subscriptionId = invoice.subscription
  let subscriptionPaid = invoice.paid
  if ((subscriptionPaid === false) ||
      (subscriptionId === undefined) ||
      (subscriptionId === null)) {
        console.log("No subscriptionId found, skeep it.");
        res.sendStatus(200);
        return;
      }
  db.findWarrantyBySubscriptionId(subscriptionId, (warrantyObject) => {
    let paymentsLeft = warrantyObject.periodsToCancel;
    console.log("Periods before: ", paymentsLeft);
    paymentsLeft = paymentsLeft - 1;
    console.log("Periods after: ", paymentsLeft);

    warrantyObject.periodsToCancel = paymentsLeft;
    if (paymentsLeft > 0) {
      db.saveToDB(warrantyObject, (object) => {
        res.sendStatus(200); return;
      }, (error) => {
        res.sendStatus(200); return;
      })
    } else {
      console.log("Removing subscription ", subscriptionId);
      deleteSubscriptionRecursivelly(subscriptionId, () => {
        db.destroyWarrantyRecord(warrantyObject, () =>{
           res.sendStatus(200);
           return;
        }, (error) => {
          res.sendStatus(200);
          return;
        });
      });
    }
  }, (error) => {
    console.log(error);
    res.sendStatus(200);
  })
  // res.sendStatus(200);
});

function checkIfRightMode(req, res, next) {
  if (req.body.livemode === false) { // TODO: true for production
    next()
  } else {
    res.sendStatus(200); // Skip this event
  }
}

function checkEvent(req, res, next) {
  // TODO: fetch event from server for production
  let event = req.body
  if (req.body.type === "charge.succeeded") {
    let invoice = event.data.object
    if ((invoice === undefined) || (invoice === null)) {
      console.log("No invoice found");
      res.sendStatus(200);
      return;
    }
    let subscriptionId = invoice.subscription
    db.isStripeEventProcessed(event.id, (found) => {
      if (!found) {
        db.addStripeEventToProcessed(event.id, (event) =>{
          next();
        }, (error) => {
          console.log("addStripeEventToProcessed: ", error);
          res.sendStatus(200);
        })
      } else {
        res.sendStatus(200);
      }
    })
  } else {
    res.sendStatus(200); // Skip this event
  }
}

function refetchEvent(req, res, next) {
/*  if (req.body.livemode === false) { // TODO: true for production
    next()
  } else {
    res.sendStatus(200); // Skip this event
  }*/
  stripe.events.retrieve(req.body.id, (err, event) => {
    if (err !== null) {
      console.log("This event is a fake!");
      res.sendStatus(200); return;
    } else {
      console.log("This event is real.");
      req.body = event;
      next();
    }
  });
}

module.exports.router = router;