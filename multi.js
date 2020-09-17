#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var http = require('http');


var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8105, function() {
    console.log((new Date()) + ' Server is listening on port 8105');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
var rooms = [];
var chatHistory = [];
// code
// 0 join or create
// 1 msg
// 2 quit
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      //console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    //console.log("request: " + JSON.stringify(request));
    //console.log("request.origin: " + request.origin);
    var connection = request.accept('echo-protocol', request.origin);

    //console.log((new Date()) + ' Connection accepted.');
    //console.dir(connection);
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var msg = message.utf8Data;
            console.log('Received Message: ' + msg);
            var msgBroadcast = '';
            
            var chatCode = 0; // 0-join, 1-msg, 2-quit
            var msgContent = msg.substr(underBarIndex + 1, msg.length - underBarIndex - 1);
            
            var skipHistory = false;
            chatCode = msg.substring(0, 1);
            if (msg.substring(0, 1) == '0') { // join or create
                var underBarIndex = msg.indexOf('_');
                var roomName = msg.substring(1, underBarIndex);
                console.log("underbar index: " + underBarIndex);
                console.log("room name: " + roomName);

                if (rooms[roomName] === undefined) {
                    rooms[roomName] = [];
                    chatHistory[roomName] = [];
                    //                    console.log("create room: " + roomName);
                }else if (rooms[roomName].length >= 2) {
                    // error code
                    // 0: full
                    connection.sendUTF("err_0");
                    return;
                }
                connection.roomName = roomName;
                connection.index = rooms[roomName].length;
                connection.userName = msgContent;

                chatCode = '0';
                var i = 0;
                var users = '';
                for (i = 0; i < rooms[roomName].length; i++) {
                    rooms[roomName][i].sendUTF(chatCode + connection.userName + ",");
                    console.log("send peer " + chatCode + connection.userName + ",");
                    users += rooms[roomName][i].userName + ",";
                }
                console.log("send you " + chatCode + users);
                connection.sendUTF(chatCode + users);
                rooms[roomName].push(connection);

                return;
                
//                console.log(connection.userName + " join");
//                console.log("total user count in room " + roomName + ": " + rooms[roomName].length);

                skipHistory = true;
            } else if(msg.substring(0, 1) == '1'){ // msg

                //console.log(connection.userName + " msg:" + msgContent);

                msgContent = connection.userName + ':' + msgContent;
            } else if(msg.substring(0, 1) == '2'){ // quit

                //console.log(connection.userName + " quit");

                connection.close();
                skipHistory = true;
            } else if (msg.substring(0, 1) == '3') { // game start
                for (i = 0; i < rooms[connection.roomName].length; i++) {
                    rooms[connection.roomName][i].sendUTF(msg);
                }
            } else if (msg.substring(0, 1) == '4') { // unit move

            } else if (msg.substring(0, 1) == '5') { // unit move and attack

            } else if (msg.substring(0, 1) == '6') { // construct

            } else if (msg.substring(0, 1) == '7') { // destroy

            } else if (msg.substring(0, 1) == '8') { // unit dead

            } else if (msg.substring(0, 1) == '9') { // unit created

            } else if (msg.substring(0, 1) == 'a') { // quick match
                // requesting data -> 0username_unitdata(34_3:index_level),unitdata
                var isRoomAvailable = false;
                var availableRoomName;
                for (var key in rooms) {
                    // check if the property/key is defined in the object itself, not in parent
                    if (rooms.hasOwnProperty(key) && rooms[key].length < 2) {
                        console.log('room found: ' + key);
                        isRoomAvailable = true;
                        availableRoomName = key;
                        break;
                    }
                }

                
                if (!isRoomAvailable) {
                    availableRoomName = 'r' + rooms.length + '_' + Math.floor((Math.random() * 100));
                    rooms[availableRoomName] = [];
                    chatHistory[availableRoomName] = [];
                    console.log("no available room so create: " + availableRoomName);

                } else{
                    console.log("available room name: " + availableRoomName);
                }

                //var underBarIndex = msg.indexOf('_');
                var userInfo = msg.substring(1, msg.length);
                

                connection.roomName = availableRoomName;
                connection.index = rooms[availableRoomName].length;
                connection.userInfo = userInfo;

                chatCode = '0';
                var i = 0;
                var returnMsg = '';
                var count = rooms[availableRoomName].length;
                for (i = 0; i < count; i++) {
                    rooms[availableRoomName][i].sendUTF(chatCode + connection.userName);
                    console.log("send peer return" + chatCode + connection.userName + ",");
                    if (i == count - 1) {
                        returnMsg += rooms[availableRoomName][i].userInfo;
                    } else {
                        returnMsg += rooms[availableRoomName][i].userInfo + ",";
                    }
                }

                console.log("send you return" + chatCode + returnMsg);
                connection.sendUTF(chatCode + returnMsg);
                rooms[availableRoomName].push(connection);

                return;
            }
            console.log("roomName: " + connection.roomName + "/connection: " + connection);
            console.log("connection.roomName: " + connection.roomName);
            if (typeof connection !== 'undefined' && typeof connection.roomName !== 'undefined' && rooms.hasOwnProperty(connection.roomName)){
                rooms[connection.roomName].forEach(myFunction);
            }
            if(!skipHistory){
                chatHistory[connection.roomName].push(chatCode + msgContent);
                if (chatHistory[connection.roomName].length > 50){
                    chatHistory[connection.roomName].shift();
                }
            }
//            console.log("peers: " + rooms[roomName].length);

            function myFunction(peer) {
//                console.log("send message to peer: " + peer.userName);

                peer.sendUTF(chatCode + msgContent);
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected from ' + connection.roomName);
        
        if(typeof connection !== 'undefined' && typeof connection.roomName !== 'undefined' && rooms.hasOwnProperty(connection.roomName)){
                rooms[connection.roomName].forEach(myFunction);            
            function myFunction(peer) {
                peer.sendUTF('2' + connection.userName);
            }
        
//        if(rooms.indexOf(connection.roomName) >= 0){
            const index = rooms[connection.roomName].indexOf(connection);
            console.log("peer index in chatRoom " + index);
            console.log("chatRoom " + connection.roomName + " users left : " + rooms[connection.roomName].length);
            
            if (index > -1) {
                rooms[connection.roomName].splice(index, 1);
            }

            if (rooms[connection.roomName].length == 0) {
                console.log("no one left so erase room. room count: " + rooms.length);
                rooms.splice(rooms.indexOf(rooms[connection.roomName]), 1);
                console.log("no one left so erase room. room count: " + rooms.length);
            }
//        }
            console.log("disconnected total user count in room " + connection.roomName + "/ left count: " + rooms[connection.roomName].length);
        }
    });
});


