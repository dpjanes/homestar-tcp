/*
 *  TCPConnectedBridge.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-02-03
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var homestar = require('homestar')
var _ = homestar._;
var bunyan = homestar.bunyan;

var TCPControlPoint = require('./tcp-connected');

var logger = bunyan.createLogger({
    name: 'homestar-tcp',
    module: 'TCPConnectedBridge',
});

/**
 *  See {iotdb.bridge.Bridge#Bridge} for documentation.
 *  <p>
 *  @param {object|undefined} native
 *  only used for instances, should be 
 */
var TCPConnectedBridge = function(initd, native) {
    var self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/TCPConnectedBridge/initd"),
        {
            host: "lighting.local",
            poll: 30,
        }
    );
    self.native = native;
    self.stated = {};

    if (self.native) {
        self.queue = _.queue("TCPConnectedBridge");
    }
};

TCPConnectedBridge.prototype = new iotdb.Bridge();

TCPConnectedBridge.prototype.name = function () {
    return "TCPConnectedBridge";
};

/* --- lifecycle --- */

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.discover = function() {
    var self = this;
    
    var cp = new TCPControlPoint(self.initd.host);

    console.log("HERE:A");
    cp.GetState(function (error, rooms) {
        console.log("HERE:B");
        if (rooms === null) {
            console.log("# TCPConnectDriver.discover/GetState", "no rooms?");
            return;
        }

        for (var ri in rooms) {
            var room = rooms[ri];
            console.log("Room", room);
            /*
            discover_callback(new TCPConnectedDriver({
                room: room,
                name: room.name
            }));
            */

            /*
            tcp.GetRoomStateByName(room.name, function(error,state,level){
                console.log("State: " + state + " at Level: " + level);
                if(state === 0){
                    tcp.TurnOnRoomByName(room);
                }
            });
            tcp.SetRoomLevelByName(room.name, 100);
            */
        }
    });
};


/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.connect = function(connectd) {
    var self = this;
    if (!self.native) {
        return;
    }

    return;
    self._setup_polling();
    self.pull();
};

TCPConnectedBridge.prototype._setup_polling = function() {
    var self = this;
    if (!self.initd.poll) {
        return;
    }

    var timer = setInterval(function() {
        if (!self.native) {
            clearInterval(timer);
            return;
        }

        self.pull();
    }, self.initd.poll * 1000);
};

TCPConnectedBridge.prototype._forget = function() {
    var self = this;
    if (!self.native) {
        return;
    }

    logger.info({
        method: "_forget"
    }, "called");

    self.native = null;
    self.pulled();
}

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.disconnect = function() {
    var self = this;
    if (!self.native || !self.native) {
        return;
    }

    self._forget();
};

/* --- data --- */

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.push = function(pushd) {
    var self = this;
    if (!self.native) {
        return;
    }
};

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.pull = function() {
    var self = this;
    if (!self.native) {
        return;
    }

};

/* --- state --- */

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.meta = function() {
    var self = this;
    if (!self.native) {
        return;
    }

    return {
        // "iot:thing": _.id.thing_urn.unique("TCPConnected", self.initd.name),
        // "iot:device": _.id.thing_urn.unique("TCPConnected", self.initd.name),
        "schema:manufacturer": "http://www.tcpi.com/",
        // "schema:name": self.initd.name || "Hue",
        // "iot:number": self.initd.number,
        // "schema:manufacturer": "http://philips.com/",
        // "schema:model": "http://meethue.com/",
    };
};

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.reachable = function() {
    return this.native !== null;
};

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
TCPConnectedBridge.prototype.configure = function(app) {
};

/* --- injected: THIS CODE WILL BE REMOVED AT RUNTIME, DO NOT MODIFY  --- */
TCPConnectedBridge.prototype.discovered = function(bridge) {
    throw new Error("TCPConnectedBridge.discovered not implemented");
};

TCPConnectedBridge.prototype.pulled = function(pulld) {
    throw new Error("TCPConnectedBridge.pulled not implemented");
};

/*
 *  API
 */
exports.Bridge = TCPConnectedBridge;

