
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var io = require('socket.io-client');
var http = require('http');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var Mongoose = require('mongoose');
var db = Mongoose.createConnection('localhost', 'bitcoinpnl');

var StockSchema = new Mongoose.Schema({
  price : {
      type : Number,
      required : true,
      validate : [function(v) { return v >= 0; }, 'Price must be positive']
  },
  quantity : {
    type : Number,
    required : true,
    validate : [function(v) { return v >= 0; }, 'Quantity must be positive']
  }
});

var StockListSchema = new Mongoose.Schema({
  stocks : [StockSchema]
});

var Stock = db.model('stocks', StockSchema);
var StocksList = db.model('stockslists', StockListSchema);

var stocksList = new StocksList();

/* Stream prices from Mt Gox */
var lastBBO = { bid : 0, ask : 0 };

// Point a socket to Mt Gox's streaming API
var socket = io.connect('https://socketio.mtgox.com/mtgox');
socket.on('message', function(message) {
  if (message.channel_name == "ticker.BTCUSD") {
    lastBBO.bid = message.ticker.buy.value;
    lastBBO.ask = message.ticker.sell.value;
  }
});

app.get('/', function(req, res) {
  res.render('index', { stocksList : stocksList });
});

app.post('/stock.json', function(req, res) {
  var stock = new Stock(req.body.stock);
  stock.validate(function(error) {
    if (error) {
      res.json({ error : error });
    } else {
      stocksList.stocks.push(stock);
      stocksList.save(function(error, stocksList) {
        // Should never fail
        res.json({ stocksList : stocksList });
      });
    }
  });
});

// Open up a route so we can display this in our browser
app.get('/bbo.json', function(req, res) {
  res.json(lastBBO);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
