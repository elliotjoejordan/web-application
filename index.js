var express = require('express');
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var url = require('url');
var cookieParser = require('cookie-parser');

var app = express();
app.use(cookieParser());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

var userAccount = {username:"user1",password:"pass"};
var acceptIPs = {129.234:"concertina"};
var token = 'concertina';

//cookies parser
//app.post()    function cookieCreate(ipAddress){
//    var date = new Date();
//    date.setTime(date.getTime()+(2*60*60*1000));
//    var expires = "; expires="+date.toGMTString();
//    var newToken = Math.random().toString(36).substring(7);
//    document.cookie = ipAddress+"="+newToken+expires+"; path=/";
//}

var server = app.listen(8090, function () {

   var host = server.address().address
   var port = server.address().port

   console.log("Listening at http://%s:%s", host, port)
})

app.get('/events2017/login.html', function(req, res){
    console.log("Got a GET request for the login page");
    res.sendFile(path.join(__dirname + "/login.html"));
})

app.get('/events2017/cookieCheck', function(req, res){
    console.log("Got a GET request for cookieCheck");
    var token = req.cookies['eventsCookie'];
    ipAddress = req.ip.substring(7);
    if(ipAddress.substring(0,7) == "129.234"){
        res.send(true);
    }
    else if(acceptIPs[ipAddress] == token && acceptIPs[ipAddress] != undefined){
        res.send(true);
    }
    else{
        res.send(false);
    }
    res.end();
})

app.post('/events2017/logCheck', function(req, res){
    console.log("Got a Get request for login checker");
    var userandPass = req.body;
    var newIP = req.ip.substring(7);
    var newToken = Math.random().toString(36).substring(7);
    if(userandPass['username'] == userAccount['username'] && userandPass['password'] == userAccount['password']){
        acceptIPs[newIP] = newToken;
        res.cookie('eventsCookie', newToken, {maxAge: 7200000});
        res.send(true);
    }
    else{
        res.send(false);
    }
    res.end();
})

app.get('/events2017/index.html', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.sendFile(path.join(__dirname + "/index.html"));
})

app.get('/events2017/admin.html', function (req, res) {
   console.log("Got a GET request for the admin page");
   res.sendFile(path.join(__dirname + "/admin.html"));
})

app.get('/events2017/venues', function (req, res){
  res.setHeader('Content-Type', 'application/json');
   console.log("Got a GET request for /venues");
   var venues = JSON.parse(fs.readFileSync('venues.json', 'utf8'));
  res.json(venues);
  res.end();
})

app.get('/events2017/events/search', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  console.log("Got a Get request for /events/search");
  var q = url.parse(req.url, true);
  var qdata = q.query;
  var events = JSON.parse(fs.readFileSync('events.json', 'utf8'))['events'];
  var reEvents = {events: []}
  for (i = 0; i < events.length; i++) {
    if ((events[i].date.includes(qdata.date) || qdata.date == '') && (events[i].title.includes(qdata.title) || qdata.title == '')){
        if (qdata.title == '' && qdata.date == ''){
        }
        else {
            reEvents.events.push(events[i]);
        }
    }
  }
  if(reEvents['events'][0] == undefined){
      var returned = {error:"No events found"}
      res.json(returned);
  }
  else{
      res.json(reEvents);
  }
  res.end();
})

app.get('/events2017/events/get/:eid', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
   console.log("Got a GET request for events/get/id");
   var eventsid = req.params.eid;
   var events = JSON.parse(fs.readFileSync('events.json', 'utf8'))['events'];
   var reEvents = {events: []}
   var empty = true;
   for (i = 0; i < events.length; i++) {
     if (eventsid==events[i].event_id){
       reEvents.events.push(events[i]);
       empty = false;
     }
   }
   if(empty==false){
   res.json(reEvents);
 }
 else{
   var returned = {error:'no such event'}
   res.json(returned)
 }
   res.end()

})

app.post('/events2017/venues/add', function(req, res){
  res.setHeader('Content-Type', 'application/json');
  console.log("Got a POST request for /venues/add");
  var newVenue = req.body;
  console.log(newVenue);
  var oldVenues = JSON.parse(fs.readFileSync('venues.json', 'utf8'));
  if (newVenue.auth_token != token){
    var returned = {error:'not authorised, wrong token'}
    console.log(newVenue);
    console.log('token wrong error');
    res.json(returned);
    res.end();
  }
  else if(newVenue.name == undefined || newVenue.name == ''){
    var returned = {error:'not authorised, no name present'}
    console.log('name wrong error');
    res.json(returned);
    res.end();
  }
  else {
    delete newVenue.auth_token;
    number = Object.keys(oldVenues['venues']).length + 1;
    nameNew = 'v_' + number
    oldVenues['venues'][nameNew] = newVenue;
    fs.writeFileSync(path.join(__dirname + '/venues.json'), JSON.stringify(oldVenues), 'utf8');
    res.json(oldVenues);
    console.log('Post Complete');
    res.end();
  }
})

app.post('/events2017/events/add', function(req, res){
  res.setHeader('Content-Type', 'application/json');
  console.log("Got a POST request for /events/add");
  var newEvent = req.body;
  var oldEvents = JSON.parse(fs.readFileSync('events.json', 'utf8'));
  var allVenues = JSON.parse(fs.readFileSync('venues.json', 'utf8'));
  var expectDate = new RegExp('[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9](Z)');

  if (newEvent.auth_token != token){
    var returned = {error:'not authorised, wrong token'}
    res.json(returned);
    res.end();
  }
  else if(newEvent.event_id == undefined || newEvent.event_id == ''){
    var returned = {error:'not authorised, no id present'}
    res.json(returned);
    res.end();
  }
  else if(newEvent.title == undefined || newEvent.title == ''){
    var returned = {error:'not authorised, no title present'}
    res.json(returned);
    res.end();
  }
  else if(newEvent.venue_id == undefined || newEvent.venue_id == ''){
    var returned = {error:'not authorised, no venue_id present'}
    res.json(returned);
    res.end();
  }
  else if(allVenues['venues']['' + newEvent.venue_id] == undefined){
    var returned = {error:'not authorised, no matching venue_id'}
    res.json(returned);
    res.end();
  }
  else if(expectDate.test(newEvent.date) === false || newEvent.date == undefined){
    var returned = {error:"not authorised, invalid date"}
    res.json(returned);
    res.end();
  }
  else {
    delete newEvent.auth_token;
    var createdEvent = {};
    createdEvent.event_id = newEvent.event_id;
    createdEvent.title = newEvent.title;
    if(newEvent.blurb != undefined){
      createdEvent.blurb = newEvent.blurb;
    }
    createdEvent.date = newEvent.date;
    if(newEvent.url != undefined){
      createdEvent.url = newEvent.url;
    }
    allVenues['venues']['' + newEvent.venue_id]['venue_id'] = newEvent.venue_id;
    createdEvent.venue = allVenues['venues']['' + newEvent.venue_id];


    oldEvents.events.push(createdEvent);
    fs.writeFileSync(path.join(__dirname + '/events.json'), JSON.stringify(oldEvents), 'utf8');
    res.json(oldEvents);
    res.end();
  }
})

app.post('/events2017/login', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    console.log("Got a POST request for /login");

})
