# homestar-tcp
IOTDB Bridge for TCP (Connected Lights)

See <a href="samples/">the samples</a> for details how to add to your project.

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
