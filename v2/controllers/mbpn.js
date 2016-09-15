'use strict';
let requestify      = require('requestify'),
    MBPCredentials  = {};

MBPCredentials  = {
    Endpoint: 'http://testdealerservices.mbpnetwork.com', //'https://dealerservices.mbpnetwork.com'
    DealerCode: '012065',
    AccountUsername: 'tirekickers',
    AccountPassword: 'WERQ890XcvzYD!',
}


//Simpli-fy requests to mbpnetwork
module.exports.request = (path, para, callback) => {
    para.AccountUsername = MBPCredentials.AccountUsername;
    para.AccountPassword = MBPCredentials.AccountPassword;
    para.DealerCode = MBPCredentials.DealerCode;
    para.format = 'json'; //Make sure we ALLWAYS get a json response

    requestify.post(MBPCredentials.Endpoint + '/api/' + path, para).then((response) => {
        const res = response.getBody();
        
        if (res.Errors)
            return callback(res.Errors);

        callback(null, res);
    }).catch((err) => {
        callback(err);
    });
};