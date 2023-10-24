#!/usr/bin/node

// deploy manually
// put into /opt/webhook-relay
// yum install node npm nano
// npm install

// test and stop:
// node index.js

// setup systemctl service
// nano /lib/systemd/system/whrelay.service

/*
[Unit]
Description=whrelay - Webhook Relay service
Documentation=https://github.com/xyhtac/tg_callbot
After=network.target

[Service]
Environment=NODE_PORT=80
Environment=NODE_ENV=dev
Type=simple
ExecStart=/usr/bin/node /opt/whrelay/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
*/

// > systemctl daemon-reload
// > systemctl enable whrelay
// > systemctl start whrelay


// initiate express server
const express = require('express');
const app = express();

// link fetch module
const fetch = require('node-fetch');

const https = require('https');

const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
});

const config = {
        relay: {
                host: "127.0.0.1",
                port: "80"
        },
        endpoints: {
                MGAQPLOI: {
                        url: "",
						method: "GET",
						params: [ "date", "token" ]
                }
		}
};



app.get(/^\/([A-Z]{8})$/, async function (req, res) {

	let requestedService = req.params[0];
	let outputFields = {};
	let postData;

	if ( !config.endpoints[requestedService] || !req.query ) {
		res.send({ 'status' : 'Bad request' });
                return (0);
	}

	let paramList = config.endpoints[ requestedService ].params;
	for ( let i in paramList ) {
		if ( !req.query[ paramList[i] ] ) {
			res.send({ 'status' : 'Insufficient data' });
			return (0);
		}
		outputFields[ paramList[i] ] = req.query[ paramList[i] ];
	}

	let getUrlString = config.endpoints[requestedService].url;

	// append url with query for get method
	if ( config.endpoints[requestedService].method == "GET" ) {
		getUrlString = getUrlString + '/?' + new URLSearchParams( outputFields );
	} else {
		postData = JSON.stringify(outputFields);
	}

        await fetch( getUrlString, {
                method: config.endpoints[requestedService].method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
		body: postData,
		agent: httpsAgent
	}).then(res => res.json())
	.then(callback => {
		console.log ('Pulled handle: ' + getUrlString );

		if ( callback[ "status" ] == "redirect" ) {
			// redirect to fetched url
                	res.redirect( callback['url'] );
	                console.log ('Response redirect: ' + callback['url'] );
	                return (0);
		} else {
			// print fetched status
			res.send({ 'status' : callback['status'] });
			console.log ('Response status: ' + callback['status'] );
			return (0);
		}
        }).catch(err => {
                console.log(err);
                res.send({ 'status' : 'Processing failed' });
                return(0);
        })


});


// initiate web server
app.listen( config.relay.port );

// print diagnostic data to console
console.log('Server started at http://' + config.relay.host + ':' + config.relay.port); 

