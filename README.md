# homestar-tcp
IOTDB Bridge for TCP (Connected Lights)
# Quick Start

XXX

	$ npm install -g homestar ## with 'sudo' if error
	$ npm install iotdb
	$ homestar install homestar-wemo
	$ node
	>>> iotdb = require('iotdb')
	>>> iot = iotdb.iot()
	>>> things = iot.connect("WeMoSocket")
	>>> things.set(":on", false)

