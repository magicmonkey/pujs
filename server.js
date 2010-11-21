var http = require('http');
var io = require('./socket.io');
var fs = require("fs");

var topics = {}; // store last seen message for each topic
var listeners = {};

var server = http.createServer(function(req, response) {

    var url = require('url').parse(req.url, true);

    if(url.pathname == '/publish' && req.method == 'POST') {
        req.addListener("data", function(chunk) {
            if(req.content == undefined) req.content = "";
            req.content += chunk;
        });
        req.addListener("end", function() {
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end();
            var obj = JSON.parse(req.content);
            publish(obj.topic, obj.message);
            console.log(req.content);
            //console.log(obj);
        });
    } else if(url.pathname == '/stats') {
        var str = "<h1>Stats</h1>";
        // list topics we have seen
        str += "<h2>Topics</h2>";
        for(var i in topics) {
            str += "<p>"+i+"</p>";
        }
        // list topic specs we have (and client count)
        str += "<h2>Subscription</h2>";
        for(var j in listeners.clients) {
            str += "<p>"+j+": "+listeners.clients[j].length+"</p>";
        }

        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(str);

    } else {
        response.writeHead(200, {'Content-Type': 'text/html'});
        fs.readFile('client.html', function(err, data) {
            response.end(data);
            console.log("served client page");
        });
    }
});
server.listen(8080);


listeners.getByTopic = function(topic) {
    var matches = [];

    for(spec in this.clients) {
        if(this.matches(topic, spec)) {
            for(client in this.clients[spec]) {
                matches.push(this.clients[spec][client]);
            }
        }
    }
    return matches;
};
listeners.add = function(client, topicSpec) {
    if(this.clients[topicSpec] == undefined) {
        this.clients[topicSpec] = [];
    }
    this.clients[topicSpec].push(client);

    for(var i in topics) {
        if(this.matches(i, topicSpec)) {
            console.log("sending last known message on " + i + " to new client");
            client.send(topics[i]);
        }
    }
};
listeners.remove = function(client, topicSpec) {
    if(topicSpec && this.clients[topicSpec]) {
        for(var i=0; i<this.clients[topicSpec].length;i++ ) {
            if(this.clients[topicSpec][i] == client) {
                this.clients[topicSpec].splice(i,1);
            }
        }
    } else {
        for(i in this.clients) {
            for(j in this.clients[i]) {
                if(this.clients[i][j] == client) {
                    this.clients[i].splice(j,1);
                }
            }
        }
    }
};
// TODO this is extremely noddy and limited!
listeners.matches = function(topic, spec) {
    var specparts = spec.split('/');
    var topicparts = topic.split('/');

    for(i in topicparts) {
        if(topicparts[i] == specparts[i]) {
        } else if(topicparts[i] == "*") {
        } else if(specparts[i] == "*") {
        } else {
            return false;
        }
    }
    return true;
};
listeners.clients = {};

var socket = io.listen(server);
socket.on('connection', function(client){
  // new client is here!
  console.log("new client connected");

  client.on('message', function(m) {
      if(m.subscribe) {
          listeners.add(client, m.subscribe);
      } else if(m.unsubscribe) {
          listeners.remove(client, m.unsubscribe);
      } else {
          console.log("unrecognised message!");
          console.log(m);
      }
  });
  client.on('disconnect', function() {
      listeners.remove(client);
  });
});

function publish(topic, msg) {
    topics[topic] = msg;
    var clients = listeners.getByTopic(topic);
    console.log("publishing " + topic + " to " + clients.length + " clients");
    for(i in clients) {
        var l = clients[i];
        l.send(msg);
    }
}