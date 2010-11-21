var http = require('http');


function publish(topic, msg) {
    var body = JSON.stringify({topic: topic, message: msg});
    var client = http.createClient(8080, "localhost");
    var request = client.request("POST", "/publish");


    console.log(body);
    request.on('response', function (response) {
        //console.log("sent");
    });

    request.end(body);
}

var f = function() {
    //console.log("sending");
    publish("/foo/bar", "message sent to /foo/bar");
    publish("/foo/foo", "message sent to /foo/foo");
    publish("/testing/foo", "message sent to /testing/foo");
    setTimeout(f, 1000);
};
f();