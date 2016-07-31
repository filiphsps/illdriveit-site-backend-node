/*
	Email.js
	Send emails based on templates.
	
	THIS IS NOT OPEN SOURCE!
	ILLDRIVE.IT IS ALLOWED TO USE &
	MODIFY THIS BUT NOT TO SHARE IT.
	
	IT'LL EVENTUALLY BE RELEASED AS
	OPEN SOURCE ANYWAYS;
	
	(c) 2016 Filiph Sandström & filfat Studios AB, All rights are reserved.
*/
'use strict';
let fs                  = require('fs'),
	emailjs             = require('emailjs');
let email_server 		= emailjs.server.connect({
    user: 'illdriveit-email',
    password: 'illdriveit21',
    host: 'smtp.sendgrid.net',
    port: '587',
    ssl: false
});

exports.sendEmail = function (email, subject, user, variables, callback) {
    //Non-blocking
    process.nextTick(function() {
		
        //Read email .html file
        fs.readFile('./email-templates/' + email + '.html', 'utf8', function (err, html) {
            if (err)
                return callback(err);
            
            let body = html;
			
			//Replace keys with data
            for (var variable in variables) {
                if (!variables.hasOwnProperty(variable)) continue;
                
                body = body.split('{{' + variable + '}}').join(variables[variable]);
            }
            
            let email = {
                from: 'illdrive.it <no-reply@illdrive.it>',
                text: subject + ' (You need a modern email client to view this email)',
                to: user.name + '<' + user.email + '>',
                subject: subject,
                attachment: 
                    [{
                        data: body,
                        alternative: true
                    }]
            }
            
            //Send the email
            email_server.send(email, function(err, res) {
                callback(err, res);
            });
        });
    });
}