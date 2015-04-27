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

var iotdb = require('iotdb');
var _ = iotdb._;
var bunyan = iotdb.bunyan;

var arp = require('iotdb-arp');

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
var TCPConnectedBridge = function (initd, native) {
    var self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/TCPConnectedBridge/initd"),
        {
            arp: true,
            host: null,
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
 *  See {iotdb.bridge.Bridge#discover} for documentation.
 */
TCPConnectedBridge.prototype.discover = function () {
    var self = this;

    if (self.initd.arp) {
        self._discover_arp();
    /*
    } else if (self.initd.host) {
        self._discover_host(self.initd.host); */
    } else {
        logger.error({
            method: "discover",
            cause: "either initd.arp or initd.host needs to be set",
        }, "no discovery method");
    }
};

TCPConnectedBridge.prototype._discover_arp = function () {
    var self = this;

    logger.info({
        method: "_discover_arp",
    }, "called");

    arp.browser({
        verbose: true,
        poll: 3 * 60,
    }, function(error, arpd) {
        if (!arpd) {
            return;
        }

        if (!arpd.mac.match(/^D4:A9:28:/)) {
            return;
        }

        self._discover_arpd(arpd);
    });
};

TCPConnectedBridge.prototype._discover_arpd = function (arpd) {
    var self = this;

    var tcp = new TCPControlPoint(arpd.ip, 'dk0bdkn4ls3rj1dr4034xy10cy913k87am8dx179');

    tcp.GetState(function (error, rooms) {
        if (rooms === null) {
            console.log("# TCPConnectDriver.discover/GetState", "no rooms?");
            return;
        }

        for (var ri in rooms) {
            var room = rooms[ri];
            room.mac = arpd.mac;
            room.tcp = tcp;

            self.discovered(new TCPConnectedBridge(self.initd, room));
        }
    });
};


/**
 *  See {iotdb.bridge.Bridge#connect} for documentation.
 */
TCPConnectedBridge.prototype.connect = function (connectd) {
    var self = this;
    if (!self.native) {
        return;
    }

    self._validate_connect(connectd);

    self._setup_polling();
    self._pulled();
};

TCPConnectedBridge.prototype._setup_polling = function () {
    var self = this;
    if (!self.initd.poll) {
        return;
    }

    var timer = setInterval(function () {
        if (!self.native) {
            clearInterval(timer);
            return;
        }

        self.pull();
    }, self.initd.poll * 1000);
};

TCPConnectedBridge.prototype._forget = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    logger.info({
        method: "_forget"
    }, "called");

    self.native = null;
    self.pulled();
};

/**
 *  See {iotdb.bridge.Bridge#disconnect} for documentation.
 */
TCPConnectedBridge.prototype.disconnect = function () {
    var self = this;
    if (!self.native || !self.native) {
        return;
    }

    self._forget();
};

/* --- data --- */

/**
 *  See {iotdb.bridge.Bridge#push} for documentation.
 */
TCPConnectedBridge.prototype.push = function (pushd) {
    var self = this;
    if (!self.native) {
        return;
    }

    self._validate_push(pushd);

    var putd = {};

    if (pushd.on !== undefined) {
        putd.on = pushd.on;
    }

    if (pushd.brightness !== undefined) {
        if (pushed.brightness === 0) {
            putd.on = false;
        } else {
            putd.on = true;
        }

        putd.brightness = true;
    }

    var qitem = {
        id: "push",
        run: function () {
            if (putd.on) {
                self.native.tcp.TurnOnRoomByName(self.native.name);
            } else {
                self.native.tcp.TurnOffRoomByName(self.native.name);
            }

            if (putd.brightness !== undefined) {
                self.native.tcp.SetRoomLevelByName(self.native.name, putd.brightness);
            }
            
            self.pulled(putd);
            self.queue.finished(qitem);
        }
    };
    self.queue.add(qitem);
};

/**
 *  See {iotdb.bridge.Bridge#pull} for documentation.
 */
TCPConnectedBridge.prototype.pull = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    var qitem = {
        id: "pull",
        run: function () {
            self.native.tcp.GetState(function(error, rooms) {
                if (error) {
                } else {
                    for (var ri in rooms) {
                        var room = rooms[ri];
                        if (room.name === self.native.name) {
                            _.extend(self.native, room)
                            self._pulled();
                            break;
                        }
                    }
                }

                self.queue.finished(qitem);
            });
        }
    };
    self.queue.add(qitem);
};

TCPConnectedBridge.prototype._pulled = function() {
    var self = this;

    var on = false;
    var level = 0;

    for (var di in self.native.device) {
        var device = self.native.device[di];
        on |= (device.state !== "0");
        level = Math.max(level, parseInt(device.level || 0));
    }

    self.pulled({
        on: on,
        brightness: level,
    });
};

/* --- state --- */

/**
 *  See {iotdb.bridge.Bridge#meta} for documentation.
 */
TCPConnectedBridge.prototype.meta = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    return {
        "iot:thing": _.id.thing_urn.unique("TCPConnected", self.native.mac.replace(/:/g, "")),
        "schema:manufacturer": "http://www.tcpi.com/",
        "schema:name": self.native.name || "TCPi",
    };
};

/**
 *  See {iotdb.bridge.Bridge#reachable} for documentation.
 */
TCPConnectedBridge.prototype.reachable = function () {
    return this.native !== null;
};

/**
 *  See {iotdb.bridge.Bridge#configure} for documentation.
 */
TCPConnectedBridge.prototype.configure = function (app) {};

/*
 *  API
 */
exports.Bridge = TCPConnectedBridge;
