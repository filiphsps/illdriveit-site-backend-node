'use strict';

function isStateSupported(state) {
	let states = new Set([
		'IL', //Illinois
		'OR', //Oregon
		'NV', //Nevada
		'CO', //Colorado
		'WA', //Washington
		'DE', //Delaware
		'ID', //Idaho
		'IN', //Indiana
		'KS', //Kansas
		'KY', //Kentucky
		'MA', //Massachusetts
		'MI', //Michigan
		'MT', //Montana
		'NJ', //New Jersey
		'ND', //North Dakota
		'OH', //Ohio
		'PA', //Pennsylvania
		'RI', //Rhode Island
		'SD', //South Dakota
		'TN', //Tennessee
		'WV', //West Virginia
		'TX', //Texas
		'FL', //Florida
		'AR', //Arkansas
		'ME', //Maine
		'NH', //New Hampshire
		'VT', //Vermont
		'MS', //Mississippi
		'GA', //Georgia
		'NE', // Nebraska
		'AL'  // Alabama
    ]);
    return states.has(state);
}

function validateZIP(zip, result) {
	let zipLookup = require('cities').zip_lookup(zip);
	let state =  zipLookup ? zipLookup.state_abbr : "";
	let city = zipLookup ? zipLookup.city : "UNKNOWN";
	result(isStateSupported(state), state);
	return;
}

module.exports.validateZIP = validateZIP;
