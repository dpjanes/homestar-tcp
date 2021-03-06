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

tcp.GetState(function (error, rooms) {
    if (error) {
        console.log("#", "tcp.GetState", error);
        process.exit(1);
    }

    console.log("+", "tcp.GetState");
    rooms.map(function(room) {
        console.log("+", "room", room.rid, room.name);
        console.log(room);
    });
});
