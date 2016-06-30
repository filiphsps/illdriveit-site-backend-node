var db = require('./db.js')

function sendError(res, error) {
  var errorResult = { result: "error",error: error};
  res.json(errorResult)
}

function inspectionId(inspection) {
  let hash = crypto.createHash('sha256');
  hash.update(inspection.vin)
    .update(inspection.first_name)
    .update(inspection.last_name);
  hash.update(inspection.date.toString());
  let id = hash.digest('hex');
  return id;
}

function roundToCentUp(cost) {
    return Math.ceil(cost*100)/100
}


module.exports.sendError = sendError;
module.exports.inspectionId = inspectionId;
module.exports.roundToCentUp = roundToCentUp;
