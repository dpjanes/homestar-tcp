# homestar-tcp
IOTDB Bridge for TCP (Connected Lights)

<img src="https://github.com/dpjanes/iotdb-homestar/blob/master/docs/HomeStar.png" align="right" />

See <a href="samples/">the samples</a> for details how to add to your project.

# Installation

Install Home☆Star first. 
See: https://github.com/dpjanes/iotdb-homestar#installation

Then

    $ homestar install homestar-tcp

# Credits

All the clever bits of connecting to TCP Lighting come from here:

*  https://github.com/stockmopar/connectedbytcp
*  http://home.stockmopar.com/connected-by-tcp-unofficial-api
*  http://home.stockmopar.com/updated-connected-by-tcp-api/


# Quick Start

Set the light to half-bright

	$ npm install -g homestar ## with 'sudo' if error
	$ homestar setup
	$ homestar install homestar-tcp
	$ homestar configure homestar-tcp
	$ node
	>>> iotdb = require('iotdb')
	>>> iot = iotdb.iot()
	>>> things = iot.connect("TCPConnectedLight")
	>>> things.set(":brightness", 50)

# Models

## TCPConnectLight

e.g.

    {
        "on": true,
        "brightness": 75
    }
