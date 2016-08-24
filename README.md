# homestar-tcp
[IOTDB](https://github.com/dpjanes/node-iotdb) Bridge for TCP (Connected Lights)

<img src="https://raw.githubusercontent.com/dpjanes/iotdb-homestar/master/docs/HomeStar.png" align="right" />

# About

See <a href="samples/">the samples</a> for details how to add to your project.

* [Read about Bridges](https://github.com/dpjanes/node-iotdb/blob/master/docs/bridges.md)

## Credits

All the clever bits of connecting to TCP Lighting come from here:

*  https://github.com/stockmopar/connectedbytcp
*  http://home.stockmopar.com/connected-by-tcp-unofficial-api
*  http://home.stockmopar.com/updated-connected-by-tcp-api/

# Installation and Configuration

* [Read this first](https://github.com/dpjanes/node-iotdb/blob/master/docs/install.md)
* [Read about installing Home☆Star](https://github.com/dpjanes/node-iotdb/blob/master/docs/homestar.md) 

    $ npm install -g homestar    ## may require sudo
    $ homestar setup
    $ npm install homestar-tcp
    $ homestar configure homestar-tcp

# Use

Set the light to half-bright

	const iotdb = require('iotdb')
	const things = iotdb.connect("TCPConnectedLight")
	things.set(":brightness", 50)

# Models

## TCPConnectLight

e.g.

    {
        "on": true,
        "brightness": 75
    }
