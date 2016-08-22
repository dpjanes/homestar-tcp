# homestar-tcp
[IOTDB](https://github.com/dpjanes/node-iotdb) Bridge for TCP (Connected Lights)

<img src="https://raw.githubusercontent.com/dpjanes/iotdb-homestar/master/docs/HomeStar.png" align="right" />

See <a href="samples/">the samples</a> for details how to add to your project.

# Installation

Install Home☆Star first. 
See: https://github.com/dpjanes/iotdb-homestar#installation

Then

    $ homestar install homestar-tcp
    $ homestar configure homestar-tcp

# Credits

All the clever bits of connecting to TCP Lighting come from here:

*  https://github.com/stockmopar/connectedbytcp
*  http://home.stockmopar.com/connected-by-tcp-unofficial-api
*  http://home.stockmopar.com/updated-connected-by-tcp-api/


# Quick Start

Install and configure

	$ npm install -g homestar ## with 'sudo' if error
	$ homestar setup
	$ homestar install homestar-tcp
	$ homestar configure homestar-tcp

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
