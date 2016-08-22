/*
 *  Use a Model to manipulate semantically
 */

"use strict";

const iotdb = require("iotdb");
const _ = iotdb._;

try {
    var model = require('homestar-wemo');
} catch (x) {
    var model = require('../index');
}

const _ = model.iotdb._;

const wrapper = model.wrap("TCPConnectedLight");
wrapper.on('thing', function (model) {
    console.log("+ discovered\n ", model.thing_id(), "\n ", model.state("meta"));
    model.on("state", function (model) {
        console.log("+ state\n ", model.state("istate"));
    });
    model.on("meta", function (model) {
        console.log("+ meta\n ", model.state("meta"));
    });

    var count = 0;
    var timer = setInterval(function () {
        if (!model.reachable()) {
            console.log("+ model not reachable");
            return;
        }

        model.set(":on", count++ % 2);
    }, 2500);

});
