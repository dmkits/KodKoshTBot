//>>built
define("dojox/lang/functional/listcomp",["dojo","dijit","dojox"],function(c,l,e){c.provide("dojox.lang.functional.listcomp");(function(){var g=/\bfor\b|\bif\b/gm,b=function(a){var b=a.split(g);a=a.match(g);for(var c=["var r \x3d [];"],h=[],f=0,e=a.length;f<e;){var k=a[f],d=b[++f];"for"!=k||/^\s*\(\s*(;|var)/.test(d)||(d=d.replace(/^\s*\(/,"(var "));c.push(k,d,"{");h.push("}")}return c.join("")+"r.push("+b[0]+");"+h.join("")+"return r;"};c.mixin(e.lang.functional,{buildListcomp:function(a){return"function(){"+
b(a)+"}"},compileListcomp:function(a){return new Function([],b(a))},listcomp:function(a){return(new Function([],b(a)))()}})})()});
//# sourceMappingURL=listcomp.js.map