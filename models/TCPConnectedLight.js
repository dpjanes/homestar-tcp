/*
 *  TCPConnectedLight.js
 *
 *  David Janes
 *  IOTDB
 *  2014-08-10
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('TCPConnectedLight')
    .facet(":lighting")
    .name("TCP Connected Light")
    .io("on", iotdb.boolean.on)
    .io("brightness", iotdb.number.percent.brightness)
    .make();

exports.binding = {
    bridge: require('../TCPConnectedBridge').Bridge,
    model: exports.Model,
};
