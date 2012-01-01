#!/usr/bin/env node
/*jshint asi:true, nodejs:true, laxbreak:true*/

exports.encode = function(report, callback){
    callback(null, HEADER + tag(null, report))
}

var HEADER = '<?xml version="1.0" encoding="UTF-8" ?>'

function tag(nodeName, node){
    if (!nodeName){
        -- nodify.depth
        node = nodify(node)
        ++ nodify.depth
        return node.innerXML
    }
    node = nodify(node, nodeName)
    
    var xml = ''
    xml += '\n' + Array(nodify.depth).join('\t')
    xml += '<'
    xml += nodeName
    
    if (node.attributes){
        xml += reduceObject(node.attributes, function(attrs, value, key){
            if (key == 'nodeName') return attrs
            return attrs + attr(key, value)
        }, '')
    }
    if (node.innerXML){
        xml += '>'
        xml += node.innerXML
        xml += '</' + nodeName + '>'
    }
    else xml += ' />'
    return xml
}

nodify.depth = 1
function nodify(originalNode, nodeName){
    if (originalNode == null) return {}
    var node = {}
    
    var xml = []
    var attributes = {}
    
    if (typeof originalNode != 'object') {
        xml.cdata = true
        xml.push(originalNode)
        originalNode = {}
    }
    
    ++ nodify.depth
    each(originalNode, function(value, key){
        if (Array.isArray(value)) {
            value.forEach(function(value){
                xml.push(tag(key, value))
            })
            return
        }
        if (nodeName == 'properties') {
            xml.push(tag('property', {name:key, value:value}))
            return
        }
        if (typeof value == 'object') {
            xml.push(tag(key, value))
            return
        }
        if (key == 'text') {
            xml.push(value)
            xml.containsNodes = false
            return
        }
        attributes[key] = value
    })
    -- nodify.depth
    xml.containsNodes = xml.containsNodes !== false
    
    node.innerXML = xml.join('')
    if (xml.containsNodes && node.innerXML) {
        node.innerXML += '\n' + Array(nodify.depth).join('\t')
    } else
    if (isCDATA(node.innerXML)) {
        node.innerXML = '<![CDATA[' + node.innerXML + ']]>'
    }
    node.attributes = attributes
    return node
}

isCDATA.regexp = /[<>&]/i
function isCDATA(text){
    if (!text) return false
    if (typeof text != 'string') return false
    return isCDATA.regexp.test(text)
}

function attr(key, value){
    return ' ' + key + '="' + value + '"'
}

function reduceObject(object, fn, initialValue){
    var keys = Object.keys(object)
    if (arguments.length == 3) return keys.reduce(reducer, initialValue)
    else return keys.reduce(reducer)
    function reducer(reducedValue, currentKey){
        return fn(reducedValue, object[currentKey], currentKey, object)
    }
}

function each(object, fn, _this){
    if (!_this) _this = object
    for (var property in object)
        if (fn.call(_this, object[property], property, object) === false)
            return false
    return true
}

////////////////////////////////////////////////////////////////////////////////

if (module.id == '.')new function(){
    
    var parse = require('./parse').parse
    ;
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
        parse(path, function(error, report){
            // delete report.testsuite.properties
            exports.encode(report, function(error, xml){
                console.log(xml)
            })
            console.log(report)
        })
    })
}
