/*
 *  This demonstrates the the raw TCP functions
 */

"use strict";

var TCPConnected = require('../tcp-connected');
var tcp = new TCPConnected('192.168.0.18', 'dk0bdkn4ls3rj1dr4034xy10cy913k87am8dx179');

tcp.SetRoomLevelByName('Bedroom', 0.5, function (error, rooms) {
    console.log("SetRoomLevelByName", error, rooms);
});
