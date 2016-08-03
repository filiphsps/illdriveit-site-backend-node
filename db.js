var crypto = require('crypto');
var path = require('path');
var utils = require('./utilities.js');
var Sequelize = require('sequelize')
  , sequelize = new Sequelize('database_name', 'username', 'password', {
      dialect: "sqlite", // or 'sqlite', 'postgres', 'mariadb'
      port:    3306, // or 5432 (for postgres)
      storage: path.resolve(__dirname)+'/db.sqlite'
    });

var Warranties = sequelize.define('Warranties', {
  vin: Sequelize.STRING,
  firstName: Sequelize.STRING,
  lastName: Sequelize.STRING,
  mileage: Sequelize.INTEGER.UNSIGNED,
  address1: Sequelize.STRING,
  address2: Sequelize.STRING,
  city: Sequelize.STRING,
  state: Sequelize.STRING,
  zip: Sequelize.STRING,
  phone: Sequelize.STRING,
  email: Sequelize.STRING,
  date: Sequelize.DATE,
  inspectionId: Sequelize.STRING, // Hash of VIN+date
  PlanIdentifier: Sequelize.STRING,
  ContractNumber: Sequelize.STRING,
  ContractDocument: Sequelize.BLOB,
  customerSignature: Sequelize.BLOB,
  signaturePlacesJSON: Sequelize.BLOB,
  ResponseID: Sequelize.STRING,
  installmentSubscriptionId: Sequelize.STRING,
  number_of_months: Sequelize.INTEGER.UNSIGNED, // Months to finance
  coverage_years: Sequelize.INTEGER.UNSIGNED,
  coverage_miles: Sequelize.INTEGER.UNSIGNED,
  downpayment: Sequelize.DECIMAL,
  monthly_payment: Sequelize.DECIMAL,
  downpayment_card: Sequelize.STRING,
  finance_payment_card: Sequelize.STRING
}, {
  tableName: 'site_warranties', // this will define the table's name
  indexes: [
    // Create a unique index on email
    {
      unique: true,
      fields: ['inspectionId']
    }]
});

var Zip = sequelize.define('Zip', {
  vin: Sequelize.STRING,
  zip: Sequelize.STRING,
  email: Sequelize.STRING
}, {
  tableName: 'site_zip', // this will define the table's name
});

var Zips = sequelize.define('zips', {
  zip: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
  state: Sequelize.STRING
}, {
  timestamps: false,
  tableName: 'zips' // this will define the table's name
});


var ProcessedStripeEvents = sequelize.define('ProcessedStripeEvents', {
  eventId: {
    type:Sequelize.STRING,
    unique: true
  }
}, {
  tableName: 'api_processed_stripe_events', // this will define the table's name
});

function initDB(succes , error) {
  sequelize
    .authenticate()
    .then((err) => {
      console.log('Connection has been established successfully.');
      preparedb( () => {
        succes();
      })
    }, (err) => {
      // console.log('Unable to connect to the database:', err);
      error(err);
    });
}

function preparedb(complete) {
  // createRoles
  sequelize
  .sync({ force: false })
  .then( (err) => {
    console.log('DB synced!');
    complete();
  }, (err) => {
    console.log('An error occurred while creating the table:', err);
  });
}

function saveWarranty(warrantyResponse, inspectionRequest, paymentOption,
   success, failed) {
  if ((typeof warrantyResponse.GeneratedContracts) !== 'object' ) {
    console.log("warrantyResponse.GeneratedContracts is not array.",
      typeof warrantyResponse.GeneratedContracts);
    failed("Bad warranty response format")
    return;
  }
  if (warrantyResponse.GeneratedContracts.length !== 1 ) {
    console.log("warrantyResponse.GeneratedContracts bad array length ",
      warrantyResponse.GeneratedContracts.length );
    failed("Bad warranty response format")
    return;
  }
  let firstWarranty = warrantyResponse.GeneratedContracts[0]
  let signaturePlacesJSON = JSON.stringify({
    SignatureFields:firstWarranty.SignatureFields
  });
  // console.log("before inspectionRequestId");
  let inspectionRequestId = utils.inspectionId(inspectionRequest);
  // console.log("after inspectionRequestId: ", inspectionRequestId);
  // console.log("paymentOption", paymentOption);
  let downpaymentCardNumber = paymentOption.downpaymentCard.account_number;
  let financeCardNumber = paymentOption.financeCard.account_number;
  if (downpaymentCardNumber && downpaymentCardNumber.length > 4) {
    downpaymentCardNumber = downpaymentCardNumber.substr(downpaymentCardNumber.length -4, 4)
  }
  if (financeCardNumber && financeCardNumber.length > 4) {
    financeCardNumber = financeCardNumber.substr(financeCardNumber.length -4, 4)
  }
  // console.log("after calculatingCardNumbers: ", inspectionRequestId);
  Warranties.findOne({where:{InspectionRequestId: inspectionRequestId}})
  .then( (warrantyObj) => {
    if (warrantyObj === null) {
      Warranties.create({
        vin: inspectionRequest.vin,
        firstName: inspectionRequest.first_name,
        lastName: inspectionRequest.last_name,
        mileage: inspectionRequest.mileage,
        address1: inspectionRequest.address1,
        address2: inspectionRequest.address2,
        city: inspectionRequest.city,
        state: inspectionRequest.state,
        zip: inspectionRequest.zip,
        phone: inspectionRequest.phone,
        email: inspectionRequest.email,
        date: inspectionRequest.date,
        inspectionId: inspectionRequestId, // Hash of VIN+date
        PlanIdentifier: firstWarranty.PlanIdentifier,
        ContractNumber: firstWarranty.ContractNumber,
        // TODO: turn it on in production
        ContractDocument: firstWarranty.ContractDocument,
        customerSignature:  inspectionRequest.signature,
        signaturePlacesJSON: signaturePlacesJSON,
        ResponseID: warrantyResponse.ResponseID,
        number_of_months: paymentOption.number_of_months, // Months to finance
        coverage_years: inspectionRequest.coverage_years,
        coverage_miles: inspectionRequest.coverage_miles,
        downpayment: paymentOption.downpayment,
        monthly_payment: paymentOption.monthly_payment,
        downpayment_card: downpaymentCardNumber,
        finance_payment_card: financeCardNumber
      }).then( (warranty) => {
        success(warranty); return;
      }, (error) => {
        failed("Cant create warranty"); return;
      })
    } else {
      warrantyObj.PlanIdentifier = firstWarranty.PlanIdentifier;
      warrantyObj.ContractNumber = firstWarranty.ContractNumber;
      warrantyObj.ContractDocument = new Buffer(firstWarranty.ContractDocument);
      warrantyObj.ResponseID = warrantyResponse.ResponseID;

      signaturePlacesJSON = new Buffer(signaturePlacesJSON),
      warrantyObj.save().then( (warrantySuccessObj) => {
        succes(warrantySuccessObj); return;
      }, (error) => {
        console.log("Cannot save warranty");
        failed("Cannot save warranty")
      })
    }
  }, (error) => {
    // console.log("Cannot Find warranty");
    Warranties.create({
      vin: inspectionRequest.vin,
      firstName: inspectionRequest.first_name,
      lastName: inspectionRequest.last_name,
      mileage: inspectionRequest.mileage,
      address1: inspectionRequest.address1,
      address2: inspectionRequest.address2,
      city: inspectionRequest.city,
      state: inspectionRequest.state,
      zip: inspectionRequest.zip,
      phone: inspectionRequest.phone,
      email: inspectionRequest.email,
      date: inspectionRequest.date,
      inspectionId: inspectionRequestId, // Hash of VIN+date
      PlanIdentifier: firstWarranty.PlanIdentifier,
      ContractNumber: firstWarranty.ContractNumber,
      // TODO: turn it on in production
      ContractDocument: firstWarranty.ContractDocument,
      customerSignature:  inspectionRequest.signature,
      signaturePlacesJSON: signaturePlacesJSON,
      ResponseID: warrantyResponse.ResponseID,
      number_of_months: paymentOption.number_of_months, // Months to finance
      coverage_years: inspectionRequest.coverage_years,
      coverage_miles: inspectionRequest.coverage_miles,
      downpayment: paymentOption.downpayment,
      monthly_payment: paymentOption.monthly_payment,
      downpayment_card: downpaymentCardNumber,
      finance_payment_card: financeCardNumber
    }).then( (warranty) => {
      success(warranty); return;
    }, (error) => {
      failed("Cant create warranty"); return;
    })
  })
}

function destroyWarrantyRecord(warranty, success, failed) {
  Warranties.destroy({where: {id:warranty.id}}). then(()=> {
    success()
  }, (error) => {
    failed("Cannot destroy warranty");
  })
}

function findWarrantyBySubscriptionId(subscriptionId, success, failed) {
  Warranties.findOne({where: {installmentSubscriptionId: subscriptionId}})
  .then(success, (error) => {
    failed("Cannot find warranty " + error);
  })
}

function isStripeEventProcessed(eventId, result) {
  ProcessedStripeEvents.findOne({where: {eventId: eventId}})
  .then((event) => {
    if (event !== null) {
      result(true)
    } else {
      result(false)
    }
  }, (error) => {
    result(false)
  });
}

function addStripeEventToProcessed(eventId, success, failed) {
  ProcessedStripeEvents.create({eventId: eventId})
  .then(success, (error) => {
    failed("Cant add event to queue: " + error)
  })
}

function addZIP (zip, vin, success, failed) {
  Zip.findOrInitialize({where:{vin: vin}})
  .spread( (zipObj) => {
      zipObj.zip = zip;
      zipObj.save().then( (obj) => {
          success();
      }, (error) => {
          failed("Can't add zip to DB");
      });
  }, (error) => {
      failed("Can't add zip to DB");
  });
}

function addEmailForNotification (email, vin, success, failed) {
  Zip.findOrInitialize({where:{vin: vin}}).spread( (zipObj) => {
      zipObj.email = email;
      zipObj.save().then( (obj) => {
          success();
      }, (error) => {
          failed("Can't add zip to DB");
      });
  }, (error) => {
      failed("Can't add zip to DB");
  });
}


function saveToDB(object, success, failed) {
  object.save().then( success, (error) => {
    failed("Cannot save object")
  })
}

function getStateFromZIP (zip, success, failed) {
  Zips.findOne({where: {zip:parseInt(zip)}})
  .then((zipObj) => {
    if (!zipObj) {
        failed("ZIP Not Found"); return;
    }
    success(zipObj.state);
  }, (error) => {
    failed(error.toString())
  });
}

function contractByNumber(contractNumber, contract) {
  Warranties.findOne({where: {ContractNumber:contractNumber}})
  .then( (warranty) => {
    if (! warranty) {
      contract(null); return;
    }
    contract(warranty);
  }, (error) => {
    console.log("DB Error: ", error);
    contract(null); return;
  })
}

module.exports.initDB = initDB;
module.exports.saveToDB = saveToDB;
module.exports.saveWarranty = saveWarranty
module.exports.destroyWarrantyRecord = destroyWarrantyRecord
module.exports.findWarrantyBySubscriptionId = findWarrantyBySubscriptionId
module.exports.isStripeEventProcessed = isStripeEventProcessed
module.exports.addStripeEventToProcessed = addStripeEventToProcessed
module.exports.addZIP = addZIP
module.exports.addEmailForNotification = addEmailForNotification
module.exports.getStateFromZIP = getStateFromZIP
module.exports.contractByNumber = contractByNumber
