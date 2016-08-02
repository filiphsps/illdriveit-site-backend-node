var express = require('express');
var db = require('./db.js')

function isStateSupported(state) {
  let states = new Set(["IL", //Illinois
      "OR",//Oregon
      "NV",//Nevada
      "CO",//Colorado
      "WA",//Washington
      "DE",//Delaware
      "ID",//Idaho
      "IN",//Indiana
      "KS",//Kansas
      "KY",//Kentucky
      "MA",//Massachusetts
      "MI",//Michigan
      "MT",//Montana
      "NJ",//New Jersey
      "ND",//North Dakota
      "OH",//Ohio
      "PA",//Pennsylvania
      "RI",//Rhode Island
      "SD",//South Dakota
      "TN",//Tennessee
      "WV",//West Virginia
      "TX",//Texas
      "FL",//Florida
      "AR",//Arkansas
      "ME",//Maine

      "NH",//New Hampshire
      "VT",//Vermont
      "MS",//Mississippi
      "GA"//Georgia
    ])
    return states.has(state)
}

function validateZIP(zip, result) {
  db.getStateFromZIP(zip, (state) => {
      console.log("State for ZIP:",zip, "is", state);
      result(isStateSupported(state), state); return;
  }, (error) => {
    console.log(error);
    result(false); return ;
  })
  if (zip==="000") {result(false); return}
}

module.exports.validateZIP = validateZIP;
