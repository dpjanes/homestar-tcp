/*
 *  This demonstrates the the raw TCP functions
 */

var TCPConnected = require('./tcp-connected');
var tcp = new TCPConnected('192.168.0.11', 'dk0bdkn4ls3rj1dr4034xy10cy913k87am8dx179')

tcp.SetRoomOnByName('Bedroom', true, function(error, rooms) {
    console.log("SetRoomOnByName", error, rooms);
});
