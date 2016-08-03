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
		'GA'  //Georgia
    ]);
    return states.has(state);
}

function validateZIP(zip, result) {
	let state =  require('cities').zip_lookup(zip).state_abbr;
	return result(isStateSupported(state), state);
	
	if (zip==='000') {
		return result(false);
	}
}

module.exports.validateZIP = validateZIP;
