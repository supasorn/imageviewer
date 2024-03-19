var connect  = require('connect');
var static = require('serve-static');

var server = connect();


server.use(  static(__dirname + '/public'));

server.use('/', (req, res) => {
  res.send("a");
});
server.listen(3000);

var livereload = require('livereload');
var lrserver = livereload.createServer();
lrserver.watch(__dirname + "/public");
