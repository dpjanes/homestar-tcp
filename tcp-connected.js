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

/* this crap needs to go */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var iotdb = require('iotdb');
var _ = iotdb._;

var util = require('util');
var unirest = require('unirest');
var xml2js = require('xml2js');

var logger = iotdb.logger({
    name: 'homestar-tcp',
    module: 'tcp-connected',
});

var templated = {
    Request: 'cmd={{ cmd }}&data={{ data }}&fmt=xml',
    GetState: '<gwrcmds><gwrcmd><gcmd>RoomGetCarousel</gcmd><gdata><gip><version>1</version><token>{{ token }}</token><fields>name,control,power,product,class,realtype,status</fields></gip></gdata></gwrcmd></gwrcmds>',

    RoomSendCommand: '<gip><version>1</version><token>{{ token }}</token><rid>{{ rid }}</rid><value>{{ value }}</value></gip>',
    RoomSendLevelCommand: '<gip><version>1</version><token>{{ token }}</token><rid>{{ rid }}</rid><value>{{ value }}</value><type>level</type></gip>',
    LogInCommand: '<gip><version>1</version><email>{{ email }}</email><password>{{ password }}</password></gip>',
};

var TCPConnected = function (host, token) {
    var self = this;

    self._host = host;
    self._token = token;

    self.rooms = [];
};

/**
 */
TCPConnected.prototype.SyncGateway = function (callback) {
    var self = this;

    var account_value = "tcp" + _.uid(16);

    var data = _.format(templated.LogInCommand, {
        email: account_value,
        password: account_value,
    });
    var payload = _.format(templated.Request, {
        cmd: 'GWRLogin',
        data: encodeURIComponent(data),
    });

    self._request(payload, function (error, xml) {
        if (error) {
            callback(error);
        } else if (!xml) {
            callback("no response from TCP Gateway?");
        } else if (!xml.token) {
            callback("no token from TCP Gateway?");
        } else {
            callback(null, xml.token);
        }
    });
};

/**
 */
TCPConnected.prototype.GetState = function (callback) {
    var self = this;
    callback = callback ? callback : function () {};

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
                };
            }
        }

        callback(error || null, self.rooms);
    });
};

TCPConnected.prototype.TurnOnRoomByName = function (name, callback) {
    this.SetRoomOnByName(name, true, callback);
};

TCPConnected.prototype.TurnOffRoomByName = function (name, callback) {
    this.SetRoomOnByName(name, false, callback);
};

TCPConnected.prototype.SetRoomOnByName = function (name, on, callback) {
    var self = this;
    var rid = this._GetRIDByName(name);
    callback = callback ? callback : function () {};

    var data = _.format(templated.RoomSendCommand, {
        rid: rid,
        value: on ? 1 : 0,
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

/**
 *  Level is between 0 and 100
 */
TCPConnected.prototype.SetRoomLevelByName = function (name, level, callback) {
    var self = this;
    var rid = this._GetRIDByName(name);
    callback = callback ? callback : function () {};

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
            return _flatten(o[0]);
        } else {
            var ns = [];
            for (var oi in o) {
                ns.push(_flatten(o[oi]));
            }
            return ns;
        }
    } else if (typeof o === "object") {
        var nd = {};
        for (var nkey in o) {
            nd[nkey] = _flatten(o[nkey]);
        }
        return nd;
    } else {
        return o;
    }
};

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
                logger.error({
                    method: "_request",
                    cause: "likely IP address or gateway is down",
                    error: result.error,
                }, "network error");
                callback(result.error, null);
            } else if (result.body === '<gip><version>1</version><rc>404</rc></gip>') {
                callback('sync-not-pressed');
            } else if (result.body) {
                xml2js.parseString(result.body, function (error, result) {
                    if (error) {
                        callback(error);
                    } else if (!result) {
                        callback("no XML result?");
                    } else if (result.gip) {
                        callback(null, _flatten(result.gip));
                    } else {
                        callback(null, _flatten(result.gwrcmds));
                    }
                });
            } else {
                logger.error({
                    method: "_request",
                    cause: "likely TCP box error or connecting to wrong device",
                }, "no body");
                callback("no body", null);
            }
        });
};

/**
 *  API
 */
module.exports = TCPConnected;
