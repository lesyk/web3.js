var chai = require('chai');
var Web3 = require('../index');
var web3 = new Web3();
var assert = chai.assert;
var FakeHttpProvider = require('./helpers/FakeHttpProvider');

var method = 'subscribe';

var tests = [{
    args: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x324f5435', '0x564b4566f3453']
    }],
    formattedArgs: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x324f5435', '0x564b4566f3453']
    }],
    result: '0xf',
    formattedResult: '0xf',
    call: 'shh_subscribe'
},
{
    args: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x324f5435', ['0x564b4566f3453', '0x345345343453']]
    }],
    formattedArgs: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x324f5435', ['0x564b4566f3453', '0x345345343453']]
    }],
    result: '0xf',
    formattedResult: '0xf',
    call: 'shh_subscribe'
},
{
    args: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x324f5435', null, ['0x564b4566f3453', '0x345345343453']]
    }],
    formattedArgs: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x324f5435', null, ['0x564b4566f3453', '0x345345343453']]
    }],
    result: '0xf',
    formattedResult: '0xf',
    call: 'shh_subscribe'
},
{
    args: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['myString', 11, '23', null]
    }],
    formattedArgs: [{
        to: '0x47d33b27bb249a2dbab4c0612bf9caf4c1950855',
        topics: ['0x6d79537472696e67', '0x3131', '0x3233', null]
    }],
    result: '0xf',
    formattedResult: '0xf',
    call: 'shh_subscribe'
}];

describe('shh', function () {
    describe(method, function () {
        tests.forEach(function (test, index) {
            it('property test: ' + index, function () {
                
                // given
                var provider = new FakeHttpProvider();
                web3.setProvider(provider);
                web3.reset();
                provider.injectResult(test.result);
                var step = 0;
                provider.injectValidation(function (payload) {
                    if(step) {
                        assert.equal(payload.jsonrpc, '2.0');
                        assert.equal(payload.method, test.call);
                        assert.deepEqual(payload.params, test.formattedArgs);

                        step++;
                    }
                });

                test.args.push(function(err, res){});

                // call
                web3.shh[method].apply(web3.shh, test.args);
                
            });
        });
    });
});

