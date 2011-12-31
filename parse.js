#!/usr/bin/env node
/*jshint asi:true, nodejs:true, laxbreak:true*/

var fs = require('fs')
var sax = require('sax')

////////////////////////////////////////////////////////////////////////////////

exports.parse =
exports.decode =

function(path, callback){
    var DATA = {}
    // stream usage
    // takes the same options as the parser
    var saxStream = sax.createStream(false, {
        trim: true // Boolean. Whether or not to trim text and comment nodes.
        ,
        normalize: true // Boolean. If true, then turn any whitespace into a single space.
        ,
        lowercasetags: true // Boolean. If true, then lowercase tags in loose mode, rather than uppercasing them.
        ,
        xmlns: false // Boolean. If true, then namespaces are supported.
    })

    saxStream.on('error', function(error) {
        callback(error)
        this._parser.error = null
        this._parser.resume()
    })

    var tagHandlers = {}

    tagHandlers.property = function(node) {
        node = cleanAttributes(node.attributes)
        DATA[node.name] = node.value
    }
    tagHandlers.property.close = function(){}

    function cleanAttributes(attributes){
        var value, numValue
        for (var property in attributes) {
            numValue = +attributes[property]
            value = attributes[property]
            if (value && value == numValue) attributes[property] = numValue
        }
        return attributes
    }

    tagHandlers._default = function(node) {
        var nodeName = node.name
        node = cleanAttributes(node.attributes)
        if (!DATA[nodeName]) DATA[nodeName] = node
        else {
            if (!Array.isArray(DATA[nodeName])) DATA[nodeName] = [DATA[nodeName]]
            DATA[nodeName].push(node)
        }
        node.parentNode = DATA
        DATA = node
    }
    tagHandlers._default.close = function(nodeName){
        var node = DATA
        DATA = DATA.parentNode
        delete node.parentNode
    }

    saxStream.on('opentag', function(node){
        if (tagHandlers[node.name]) tagHandlers[node.name](node)
        else tagHandlers._default(node)
    })

    saxStream.on('closetag', function(nodeName) {
        if (tagHandlers[nodeName] && tagHandlers[nodeName].close)
            tagHandlers[nodeName].close(nodeName)
        else tagHandlers._default.close(nodeName)
    })

    saxStream.on('text', setValue)

    function setValue(value) {
        if (Object.keys(DATA).length == 1) DATA.toJSON = DATA.valueOf = returnThisValue
    
        if (!DATA.value) DATA.value = value
        else {
            if (!Array.isArray(DATA.value)) DATA.value = [DATA.value]
            DATA.value.push(value)
        }
    }

    var CDATA = ''
    saxStream.on('cdata', function(cdataChunk) {
        CDATA += cdataChunk
    })
    saxStream.on('closecdata', function() {
        setValue(CDATA)
        CDATA = ''
    })
    saxStream.on('end', function() {
        callback(null, DATA)
        DATA = {}
    })

    fs.createReadStream(path).pipe(saxStream)
}

function returnThisValue(){return this.value}

////////////////////////////////////////////////////////////////////////////////

if (module.id == '.')new function(){
    
    [    __dirname + "/test/TEST-net.cars.documents.AssuranceTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.BougieTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.CarburateurTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.DelcoTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.DemareurTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.diagnostics.selftest.computer.backup.BootTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.MoteurTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.PistonTest.xml"
    ]
    
    .forEach(function(path){
        exports.decode(path, function(error, report){
            if (error) return console.error(error)
            // console.log(report)
            console.log('[START]\t' + report.testsuite.name)
            ;[].concat(report.testsuite.testcase).map(function(testcase){
                console.log(
                    '['+(testcase.failure&&'FAIL' || testcase.error&&'ERROR' || "PASS")+']\t'
                        + testcase.classname + '#' + testcase.name
                )
            })
            console.log('')
        })
    })
}
