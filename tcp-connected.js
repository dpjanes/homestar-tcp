/**
 *  tcp-connected.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-08-09
 *
 *  This is an update of
 *  https://github.com/stockmopar/connectedbytcp
 *  to use simpler libraries and to use bunyan
 *
 *  See:
 *  http://home.stockmopar.com/connected-by-tcp-unofficial-api
 *  http://home.stockmopar.com/updated-connected-by-tcp-api/
 */

"use strict";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var iotdb = require('iotdb');
var _ = iotdb._;
var bunyan = iotdb.bunyan;

var util = require('util');
var unirest = require('unirest');
var xml2js = require('xml2js')

var logger = bunyan.createLogger({
    name: 'homestar-tcp',
    module: 'tcp-connected',
});

var templated = {
    Request: 'cmd={{ cmd }}&data={{ data }}&fmt=xml',
    GetState: '<gwrcmds><gwrcmd><gcmd>RoomGetCarousel</gcmd><gdata><gip><version>1</version><token>{{ token }}</token><fields>name,control,power,product,class,realtype,status</fields></gip></gdata></gwrcmd></gwrcmds>',

    RoomSendCommand: '<gip><version>1</version><token>{{ token }}</token><rid>{{ rid }}</rid><value>{{ value }}</value></gip>',
    RoomSendLevelCommand: '<gip><version>1</version><token>{{ token }}</token><rid>{{ rid }}</rid><value>{{ value }}</value><type>level</type></gip>',
    DeviceSendCommand: '<gip><version>1</version><token>{{ token }}</token><did>{{ did }}</did><value>{{ value }}</value></gip>',
    DeviceSendLevelCommand: '<gip><version>1</version><token>{{ token }}</token><did>{{ did }}</did><value>{{ value }}</value><type>level</type></gip>',
    LogInCommand: '<gip><version>1</version><email>{{ email }}</email><password>{{ password }}</password></gip>',
};


var TCPConnected = function(host, token) {
    var self = this;

    if (!host) {
        host = "lighting.local"
    }

    self._host = host;
    self._token = token;
    self.rooms = [];
};

/**
 */
TCPConnected.prototype.GetState = function (callback) {
    var self = this;
    callback = callback ? callback : function() {};

	var data = _.format(templated.GetState, {
        token: self._token,
    });
    var payload = _.format(templated.Request, {
        cmd: 'GWRBatch', 
        data: encodeURIComponent(data),
        token: self._token,
    });

    self._request(payload, function (error, xml) {
        if (xml) {
            try {
                self.rooms = xml['gwrcmd']['gdata']['gip']['room'];
                if (typeof (self.rooms["rid"]) !== 'undefined') {
                    self.rooms = [self.rooms];
                }
            } catch (err) {
                var error = {
                    error: 'Unkown Error'
                }
            }
        }

        callback(error || null, self.rooms);
    })
}

TCPConnected.prototype.TurnOnRoomByName = function (name, callback) {
    var self = this
    var rid = this._GetRIDByName(name);
    callback = callback ? callback : function() {};

    var data = _.format(templated.RoomSendCommand, {
        rid: rid, 
        value: 1,
        token: self._token,
    });
    var payload = _.format(templated.Request, {
        cmd: 'RoomSendCommand', 
        data: encodeURIComponent(data),
        token: self._token,
    });

    self._request(payload, function (error, xml) {
        callback(error);
    });
};

TCPConnected.prototype.TurnOffRoomByName = function (name, callback) {
    var self = this
    var rid = this._GetRIDByName(name);
    callback = callback ? callback : function() {};

    var data = _.format(templated.RoomSendCommand, {
        rid: rid, 
        value: 0,
        token: self._token,
    });
    var payload = _.format(templated.Request, {
        cmd: 'RoomSendCommand', 
        data: encodeURIComponent(data),
        token: self._token,
    });

    self._request(payload, function (error, xml) {
        callback(error);
    });
};

TCPConnected.prototype.SetRoomLevelByName = function (name, level, callback) {
    var self = this
    var rid = this._GetRIDByName(name);
    callback = callback ? callback : function() {};

    var data = _.format(templated.RoomSendLevelCommand, {
        rid: rid,
        value: level,
        token: self._token,
    });
    var payload = _.format(templated.Request, {
        cmd: 'RoomSendCommand', 
        data: encodeURIComponent(data),
        token: self._token,
    });

    self._request(payload, function (error, xml) {
        callback(error);
    });
};

/* note that state must have been already pulled */
TCPConnected.prototype.GetRoomStateByName = function (name, callback) {
    var self = this;
    callback = callback ? callback : function() {};

    self.rooms.forEach(function (room) {
        if (room["name"] === name) {
            var state = 0;
            var i = 0;
            var sum = 0;
            var devices = room["device"];
            if (typeof (devices["did"]) !== 'undefined') {
                i = i + 1;
                if (devices["state"] != "0") {
                    state = 1;
                    sum = sum + parseInt(devices["level"]);
                }
            } else {
                devices.forEach(function (device) {
                    i = i + 1;
                    if (device["state"] != "0") {
                        state = 1;
                        sum = sum + parseInt(device["level"]);
                    }
                });

            }
            if (i === 0) {
                sum = 0;
                i = 1;
                state = 0;
            }
            var level = sum / i;
            callback(null, state, level);
        }
    });
};

/* -- internal helpers -- */

TCPConnected.prototype._GetRIDByName = function (name) {
    var self = this;

    var rid = 0;
    self.rooms.forEach(function (room) {
        if (room["name"] === name) {
            rid = room["rid"];
        }
    });
    return rid;
};

/**
 *  This converts what xml-to-js makes to xml2js
 */
var _flatten = function (o) {
    if (Array.isArray(o)) {
        if (o.length === 1) {
            return _flatten(o[0])
        } else {
            var ns = []
            for (var oi in o) {
                ns.push(_flatten(o[oi]))
            }
            return ns
        }
    } else if (typeof o === "object") {
        var nd = {}
        for (var nkey in o) {
            nd[nkey] = _flatten(o[nkey])
        }
        return nd
    } else {
        return o
    }
}

TCPConnected.prototype._request = function (payload, callback) {
    unirest
        .post('https://' + this._host + '/gwr/gop.php')
        .headers({
            'Content-Type': 'text/xml; charset="utf-8"',
            'Content-Length': payload.length
        })
        .send(payload)
        .end(function (result) {
            if (!result.ok) {
                console.log("# TCPConnected._request", "error", result.error)
                callback(result.error, null)
            } else if (result.body) {
                xml2js.parseString(result.body, function (error, result) {
                    callback(null, _flatten(result.gwrcmds))
                });
            } else {
                console.log("# TCPConnected._request", "no body - unexpected")
                callback("no body", null)
            }
        });
};

/**
 *  API
 */
module.exports = TCPConnected;
