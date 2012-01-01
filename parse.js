#!/usr/bin/env node
/*jshint asi:true, nodejs:true, laxbreak:true*/

var fs = require('fs')
var sax = require('sax')

////////////////////////////////////////////////////////////////////////////////

exports.parse =
exports.decode =
exports.parseFile =
exports.decodeFile =
exports.parseStream =
exports.decodeStream =
function(xml, callback){
    var DATA = {}

    function error(error) {
        callback(error)
        this._parser.error = null
        this._parser.resume()
    }
    

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

    function opentag(node){
        if (tagHandlers[node.name]) tagHandlers[node.name](node)
        else tagHandlers._default(node)
    }
    function closetag(nodeName) {
        if (tagHandlers[nodeName] && tagHandlers[nodeName].close)
            tagHandlers[nodeName].close(nodeName)
        else tagHandlers._default.close(nodeName)
    }
    function setValue(value) {
        if (!DATA.text) DATA.text = value
        else {
            if (!Array.isArray(DATA.text)) DATA.text = [DATA.text]
            DATA.text.push(value)
        }
    }

    var CDATA = ''
    function cdata(cdataChunk) {
        CDATA += cdataChunk
    }
    
    function closecdata() {
        setValue(CDATA)
        CDATA = ''
    }
    
    function end() {
        callback(null, DATA)
        DATA = {}
    }

    ////////////////////////////////////////////////////////////////////////////////

    var options = {
        strict: false
        ,
        trim: true // Boolean. Whether or not to trim text and comment nodes.
        ,
        normalize: true // Boolean. If true, then turn any whitespace into a single space.
        ,
        lowercasetags: true // Boolean. If true, then lowercase tags in loose mode, rather than uppercasing them.
        ,
        xmlns: false // Boolean. If true, then namespaces are supported.
    }

    if (xml.pipe) xml.pipe(saxStream)
    else if (require('path').existsSync(xml))
        xml = fs.createReadStream(xml)

    if (xml.pipe) {
        var saxStream = sax.createStream(options.strict, options)
        saxStream.on('error', error)
        saxStream.on('opentag', opentag)
        saxStream.on('closetag', closetag)
        saxStream.on('text', setValue)
        saxStream.on('cdata', cdata)
        saxStream.on('closecdata', closecdata)
        saxStream.on('end', end)
        
        xml.pipe(saxStream)
    }
    else {
        var saxParser = sax.parser(options.strict, options)
        saxParser.onerror = error
        saxParser.onopentag = opentag
        saxParser.onclosetag = closetag
        saxParser.ontext = setValue
        saxParser.oncdata = cdata
        saxParser.onclosecdata = closecdata
        saxParser.onend = end
        
        saxParser.write('' + xml)
        saxParser.close()
    }
}

function returnThisValue(){return this.value}

////////////////////////////////////////////////////////////////////////////////

if (module.id == '.')new function(){
    var paths
    =
    [    __dirname + "/test/TEST-net.cars.documents.AssuranceTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.BougieTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.CarburateurTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.DelcoTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.DemareurTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.diagnostics.selftest.computer.backup.BootTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.MoteurTest.xml"
    ,    __dirname + "/test/TEST-net.cars.engine.PistonTest.xml"
    ]
    
    paths.forEach(function(path){
        exports.decodeFile(path, log)
    })
    
    paths.forEach(function(path){
        exports.decode(fs.readFileSync(path), log)
    })
    
    function log(error, report){
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
    }
}
