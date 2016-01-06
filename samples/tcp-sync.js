/*
 *  This demonstrates the the raw TCP functions.
 *  Sync to the gateway
 *
 *  Make sure to copy 'tcpd.json.template' to
 *  'tcpd.json' and edit. The token will be provided
 *  by 'tcp-sync.js'
 */

"use strict";

var fs = require('fs');
var TCPConnected = require('../tcp-connected');
var tcpd = require('./tcp.json');
var tcp = new TCPConnected(tcpd.host);

tcp.SyncGateway(function(error, token) {
    if (error) {
        console.log("#", "tcp.SyncGateway", error);
        process.exit(1);
    }

    console.log("+", "tcp.SyncGateway", "token", token);

    tcpd.token = token;

    fs.writeFileSync('tcp.json', JSON.stringify(tcpd, null, 2));
});
