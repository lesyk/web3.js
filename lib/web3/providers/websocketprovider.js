/*
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
 */
/** @file WebsocketProvider.js
 * @authors:
 *   Fabian Vogelsteller <fabian@ethdev.com>
 * @date 2015
 */

"use strict";

var utils = require('../../utils/utils');
var errors = require('../errors');
// var W3CWebSocket = require('websocket').w3cwebsocket;
// Default connection ws://localhost:8546


var WebsocketProvider = function (path)  {
    var _this = this;
    this.responseCallbacks = {};
    this.notificationCallbacks = [];
    this.path = path;
    this.connection = new WebSocket(path);


    this.addDefaultEvents();


    // LISTEN FOR CONNECTION RESPONSES
    this.connection.onmessage = function(e) {
        /*jshint maxcomplexity: 6 */
        var data = (typeof e.data === 'string') ? e.data : '';

        _this._parseResponse(data).forEach(function(result){

            var id = null;

            // get the id which matches the returned id
            if(utils.isArray(result)) {
                result.forEach(function(load){
                    if(_this.responseCallbacks[load.id])
                        id = load.id;
                });
            } else {
                id = result.id;
            }

            // notification
            if(!id && result.method === 'eth_subscription') {
                _this.notificationCallbacks.forEach(function(callback){
                    if(utils.isFunction(callback))
                        callback(null, result);
                });

                // fire the callback
            } else if(_this.responseCallbacks[id]) {
                _this.responseCallbacks[id](null, result);
                delete _this.responseCallbacks[id];
            }
        });
    };
};

/**
 Will add the error and end event to timeout existing calls

 @method addDefaultEvents
 */
WebsocketProvider.prototype.addDefaultEvents = function(){
    var _this = this;

    this.connection.onerror = function(){
        _this._timeout();
    };

    this.connection.onclose = function(e){
        _this._timeout();

        var noteCb = _this.notificationCallbacks;

        // reset all requests and callbacks
        _this.reset();

        // cancel subscriptions
        noteCb.forEach(function (callback) {
            if (utils.isFunction(callback))
                callback(e);
        });
    };

    // this.connection.on('timeout', function(){
    //     _this._timeout();
    // });
};

/**
 Will parse the response and make an array out of it.

 @method _parseResponse
 @param {String} data
 */
WebsocketProvider.prototype._parseResponse = function(data) {
    var _this = this,
        returnValues = [];

    // DE-CHUNKER
    var dechunkedData = data
        .replace(/\}[\n\r]?\{/g,'}|--|{') // }{
        .replace(/\}\][\n\r]?\[\{/g,'}]|--|[{') // }][{
        .replace(/\}[\n\r]?\[\{/g,'}|--|[{') // }[{
        .replace(/\}\][\n\r]?\{/g,'}]|--|{') // }]{
        .split('|--|');

    dechunkedData.forEach(function(data){

        // prepend the last chunk
        if(_this.lastChunk)
            data = _this.lastChunk + data;

        var result = null;

        try {
            result = JSON.parse(data);

        } catch(e) {

            _this.lastChunk = data;

            // start timeout to cancel all requests
            clearTimeout(_this.lastChunkTimeout);
            _this.lastChunkTimeout = setTimeout(function(){
                _this._timeout();
                throw errors.InvalidResponse(data);
            }, 1000 * 15);

            return;
        }

        // cancel timeout and set chunk to null
        clearTimeout(_this.lastChunkTimeout);
        _this.lastChunk = null;

        if(result)
            returnValues.push(result);
    });

    return returnValues;
};


/**
 Get the adds a callback to the responseCallbacks object,
 which will be called if a response matching the response Id will arrive.

 @method _addResponseCallback
 */
WebsocketProvider.prototype._addResponseCallback = function(payload, callback) {
    var id = payload.id || payload[0].id;
    var method = payload.method || payload[0].method;

    this.responseCallbacks[id] = callback;
    this.responseCallbacks[id].method = method;
};

/**
 Timeout all requests when the end/error event is fired

 @method _timeout
 */
WebsocketProvider.prototype._timeout = function() {
    for(var key in this.responseCallbacks) {
        if(this.responseCallbacks.hasOwnProperty(key)){
            this.responseCallbacks[key](errors.InvalidConnection('on IPC'));
            delete this.responseCallbacks[key];
        }
    }
};

// TODO add reconnect


/**
 Check if the current connection is still valid.

 @method isConnected
 */
WebsocketProvider.prototype.isConnected = function() {
    // try reconnect, when connection is gone
    // if(!_this.connection.writable)
    //     _this.connection.connect({path: _this.path});

    console.log(this.connection);

    // return !!this.connection.writable;
};

WebsocketProvider.prototype.sendSync = function (payload) {
    throw new Error('You tried to send "'+ payload.method +'" synchronously. Synchronous requests are not supported by the Websocket provider.');
};

WebsocketProvider.prototype.send = function (payload, callback) {
    // try reconnect, when connection is gone
    // if(!this.connection.writable)
    //     this.connection.connect({path: this.path});


    this.connection.send(JSON.stringify(payload));
    this._addResponseCallback(payload, callback);
};

/**
 Subscribes to provider events.provider

 @method on
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 @param {Function} callback   the callback to call
 */
WebsocketProvider.prototype.on = function (type, callback) {

    if(typeof callback !== 'function')
        throw new Error('The second parameter callback must be a function.');

    switch(type){
        case 'notification':
            this.notificationCallbacks.push(callback);
            break;

        case 'connect':
            this.connection.onopen = callback;
            break;

        // default:
        //     this.connection.on(type, callback);
        //     break;
    }
};

// TODO add once

/**
 Removes event listener

 @method removeListener
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 @param {Function} callback   the callback to call
 */
WebsocketProvider.prototype.removeListener = function (type, callback) {
    var _this = this;

    switch(type){
        case 'notification':
            this.notificationCallbacks.forEach(function(cb, index){
                if(cb === callback)
                    _this.notificationCallbacks.splice(index, 1);
            });
            break;

        // TODO remvoving connect missing

        // default:
        //     this.connection.removeListener(type, callback);
        //     break;
    }
};

/**
 Removes all event listeners

 @method removeAllListeners
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 */
WebsocketProvider.prototype.removeAllListeners = function (type) {
    switch(type){
        case 'notification':
            this.notificationCallbacks = [];
            break;

        // TODO remvoving connect properly missing

        case 'connect':
            this.connection.onopen = null;
            break;

        default:
            // this.connection.removeAllListeners(type);
            break;
    }
};

/**
 Resets the providers, clears all callbacks

 @method reset
 */
WebsocketProvider.prototype.reset = function () {
    this._timeout();
    this.notificationCallbacks = [];

    // this.connection.removeAllListeners('error');
    // this.connection.removeAllListeners('end');
    // this.connection.removeAllListeners('timeout');

    this.addDefaultEvents();
};

module.exports = WebsocketProvider;

