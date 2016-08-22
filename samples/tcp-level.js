/*
 *  This demonstrates the the raw TCP functions
 *
 *  Make sure to copy 'tcpd.json.template' to
 *  'tcpd.json' and edit. The token will be provided
 *  by 'tcp-sync.js'
 */

"use strict";

const TCPConnected = require('../tcp-connected');
const tcpd = require('./tcp.json');
const tcp = new TCPConnected(tcpd.host, tcpd.token);

tcp.SetRoomLevelByName(tcpd.room, 0.5, function (error) {
    if (error) {
        console.log("#", "tcp.SetRoomLevelByName", error);
        process.exit(1);
    }

    console.log("+", "tcp.SetRoomLevelByName", "ok");
});
