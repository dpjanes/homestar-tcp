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
var path = require('path');

var TCPControlPoint = require('./tcp-connected');

var logger = bunyan.createLogger({
    name: 'homestar-tcp',
    module: 'TCPConnectedBridge',
});

var arping = false;
var ipd = {};

/**
 *  See {iotdb.bridge.Bridge#Bridge} for documentation.
 *  <p>
 *  @param {object|undefined} native
 *  only used for instances, should be 
 */
var TCPConnectedBridge = function (initd, native) {
    var self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/TCPConnectedBridge/initd"), {
            arp: true,
            host: null,
            poll: 30,
        }
    );
    self.native = native;

    self._reachable = false;
    self.stated = {
        on: false,
        brightness: 0,
    };

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

    if (arping) {
        return;
    }
    arping = true;

    logger.info({
        method: "_discover_arp",
    }, "called");

    arp.browser({
        verbose: self.initd.verbose,
        poll: 3 * 60,
    }, function (error, arpd) {
        if (!arpd) {
            return;
        }

        if (!arpd.mac.match(/^D4:A9:28:/)) {
            return;
        }

        if (ipd[arpd.ip]) {
            return;
        }

        ipd[arpd.ip] = true;

        self._discover_arpd(arpd);
    });
};

TCPConnectedBridge.prototype._discover_arpd = function (arpd) {
    var self = this;

    var token_key = "/bridges/TCPConnectedBridge/" + arpd.mac + "/token";
    var token = iotdb.keystore().get(token_key);
    if (!token) {
        logger.error({
            method: "_discover_arpd",
            cause: "needs to be configured by user first",
        }, "TCP Hub is not configured");
        return;
    }

    var tcp = new TCPControlPoint(arpd.ip, token);

    tcp.GetState(function (error, rooms) {
        if (rooms === null) {
            console.log("# TCPConnectDriver.discover/GetState", "no rooms?");
            return;
        }

        for (var ri in rooms) {
            var room = rooms[ri];
            room.mac = arpd.mac;
            room.ip = arpd.ip;
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

    delete ipd[self.native.ip]

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
TCPConnectedBridge.prototype.push = function (pushd, done) {
    var self = this;
    if (!self.native) {
        done(new Error("not connected", pushd));
        return;
    }

    self._validate_push(pushd);

    var putd = {};

    if (pushd.on !== undefined) {
        putd.on = pushd.on;

        if ((pushd.brightness === undefined) && (self.stated.brightness === 0)) {
            putd.brightness = 100;
        }
    }

    if (pushd.brightness !== undefined) {
        if (pushd.brightness === 0) {
            putd.on = false;
        } else {
            putd.on = true;
        }

        putd.brightness = pushd.brightness;
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
        },
        coda: function () {
            done();
        },
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
            self.native.tcp.GetState(function (error, rooms) {
                if (error) {} else {
                    for (var ri in rooms) {
                        var room = rooms[ri];
                        if (room.name === self.native.name) {
                            _.extend(self.native, room);
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

TCPConnectedBridge.prototype._pulled = function () {
    var self = this;

    var reachable = false;

    self.stated.on = false;
    self.stated.brightness = 0;

    for (var di in self.native.device) {
        var device = self.native.device[di];
        self.stated.on |= (device.state !== "0");
        self.stated.brightness = Math.max(self.stated.brightness, parseInt(device.level || 0));
        reachable |= (device.offline !== "1");
    }

    self.pulled(self.stated);

    if (self._reachable !== reachable) {
        self._reachable = reachable;
        self.pulled();
    }
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
    return (this.native !== null) && this._reachable;
};

/**
 *  See {iotdb.bridge.Bridge#configure} for documentation.
 */
TCPConnectedBridge.prototype.configure = function (app) {
    var self = this;

    self.html_root = app.html_root || "/";

    var ds = self._find_devices_to_configure();

    app.use('/$', function (request, response) {
        self._configure_devices(request, response);
    });
    app.use('/mac/:mac$', function (request, response) {
        self._configure_device(request, response);
    });

    return "TCP Connected Light";
};

TCPConnectedBridge.prototype._configure_devices = function (request, response) {
    var self = this;

    var template = path.join(__dirname, "templates", "devices.html");
    var templated = {
        html_root: self.html_root,
        devices: self._find_devices_to_configure(),
    };

    response
        .set('Content-Type', 'text/html')
        .render(template, templated);
};

TCPConnectedBridge.prototype._configure_device = function (request, response) {
    var self = this;

    // find the MAC
    var native = null;
    var ds = self._find_devices_to_configure();
    for (var di in ds) {
        var d = ds[di];
        if (d.mac === request.params.mac) {
            native = d;
            break;
        }
    }

    if (native && (request.query.action === "pair")) {
        return self._pair_device(request, response, native);
    } else {
        return self._prepair_device(request, response, native);
    }
};

TCPConnectedBridge.prototype._prepair_device = function (request, response, native) {
    var self = this;

    var template;
    var templated = {
        html_root: self.html_root,
        device: native,
    };

    if (native) {
        template = path.join(__dirname, "templates", "pair.html");
    } else {
        template = path.join(__dirname, "templates", "error.html");
        templated.error = "This TCP Connected Bridge has not been found yet - try reloading?";
    }

    response
        .set('Content-Type', 'text/html')
        .render(template, templated);
};

TCPConnectedBridge.prototype._pair_device = function (request, response, native) {
    var self = this;

    var token_key = "/bridges/TCPConnectedBridge/" + native.mac + "/token";

    var tcp = new TCPControlPoint(native.ip);
    tcp.SyncGateway(function (error, token) {
        var template;
        var templated = {
            html_root: self.html_root,
            device: native,
        };

        if (error) {
            template = path.join(__dirname, "templates", "error.html");
            templated.error = error;
        } else {
            template = path.join(__dirname, "templates", "success.html");

            iotdb.keystore().save(token_key, token);
        }
        response
            .set('Content-Type', 'text/html')
            .render(template, templated);
    });
};

var _dd;

TCPConnectedBridge.prototype._find_devices_to_configure = function () {
    var self = this;

    if (_dd === undefined) {
        _dd = {};

        arp.browser({
            verbose: false,
            poll: 3 * 60,
        }, function (error, arpd) {
            if (!arpd) {
                return;
            }

            if (!arpd.mac.match(/^D4:A9:28:/)) {
                return;
            }

            var token_key = "/bridges/TCPConnectedBridge/" + arpd.mac + "/token";
            var token = iotdb.keystore().get(token_key);

            arpd.is_configured = token ? true : false;
            arpd.name = arpd.mac;
            _dd[arpd.mac] = arpd;
        });
    }

    var ds = [];
    for (var di in _dd) {
        var d = _dd[di];
        ds.push(d);
    }

    ds.sort(function compare(a, b) {
        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        } else {
            return 0;
        }
    });

    return ds;
};

/*
 *  API
 */
exports.Bridge = TCPConnectedBridge;
