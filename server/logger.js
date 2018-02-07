var winston = require('winston');
var fs=require('fs');
var path=require('path');
var moment = require('moment');
var devMode;
if(!process.argv[2])devMode=false;
else devMode=process.argv[2].toLowerCase().indexOf('dev')>=0;

function makeLogger(){
    var logDir= path.join(__dirname, '../logs/');
    try {
        if (!fs.existsSync(logDir))fs.mkdirSync(logDir);
    }catch (e){
        console.log("FAILED to make log directory. Reason: ",e);
    }
    var transports  = [];
    transports.push(new (require('winston-daily-rotate-file'))({
        name: 'file',
        datePattern: '.yyyy-MM-dd',
        filename: path.join(logDir, "log_file.log"),
        timestamp:function() {
            return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
        }
    }));
    if(devMode){
        transports.push(new (winston.transports.Console)({timestamp:function() {
                return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
            }}));
    }
    var logger = new winston.Logger({transports: transports,level:'silly', timestamp: function() {
        return moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    }});
    return logger;
}
module.exports=function(){
  return makeLogger();
};