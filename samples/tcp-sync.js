/*
 *  This demonstrates the the raw TCP functions.
 *  Sync to the gateway
 */

"use strict";

var TCPConnected = require('../tcp-connected');
var tcp = new TCPConnected('192.168.0.18');

tcp.SyncGateway(function () {});
