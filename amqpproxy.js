var http = require('http');
var io = require('socket.io');
var fs = require("fs");
var util = require("util");
var amqp = require("amqp");

var topics = {}; // store last seen message for each topic
var listeners = {};

var server = http.createServer(function(req, response) {

    var url = require('url').parse(req.url, true);
	if (url.pathname == '/amqpclient.html') {
        response.writeHead(200, {'Content-Type': 'text/html'});
        fs.readFile('amqpclient.html', function(err, data) {
            response.end(data);
            util.log("served client page");
        });
	}

});
server.listen(8888);


listeners.add = function(client, subInfo) {
	// Subscribe to the AMQP
	util.log("Got connection [" + client.sessionId + "] for " + util.inspect(subInfo));
	var vhost = (subInfo.vhost == undefined)    ? '/' : subInfo.vhost;
	client.amqp = {};
	client.amqp.conn = amqp.createConnection({vhost:vhost,port:5672,login:'webuser',password:'webpass',host:'localhost'});
	client.amqp.conn.on('ready', function() {
		util.log("AMQP connection ready");
		client.amqp.ex = client.amqp.conn.exchange(subInfo.exchange, {type:'topic'});
		client.amqp.ex.on('open', function() {
			client.amqp.q = client.amqp.conn.queue('browser-' + client.sessionId);
			client.amqp.q.bind(client.amqp.ex, subInfo.bind);
			client.amqp.q.subscribe(function(msg) {
				util.log('Got message to route ' + msg._routingKey);
				client.send(msg.data.toString('utf8'));
			});
		});
	});
};

listeners.remove = function(client) {
	if (client.amqp != undefined && client.amqp.conn != undefined) {
		client.amqp.conn.end();
		// Probably need to null a few things here for memory reasons
	}
};

var socket = io.listen(server);
socket.on('connection', function(client){
  client.on('message', function(m) {
      if(m.subscribe) {
          listeners.add(client, m.subscribe);
      } else if(m.unsubscribe) {
          listeners.remove(client);
      } else {
          util.log("unrecognised message!");
          util.log(m);
      }
  });
  client.on('disconnect', function() {
      listeners.remove(client);
  });
});
