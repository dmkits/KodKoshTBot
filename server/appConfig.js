var logger=require("./logger")();
var fs=require('fs');
var path=require('path');

var configFileName=null;
var appConfig=null;

module.exports.setAppConfigName=function(configParamName){
    configFileName=configParamName;
};
module.exports.loadAppConfig=function(){
    try{
        appConfig=JSON.parse(fs.readFileSync(path.join(__dirname,"../"+configFileName+'.json')))
    }catch(e){
        appConfig.error=e;
        logger.error("FAILED to get data from config file. Reason: ",e);
    }
};

module.exports.rewriteAppConfig=function(newAppConfig,callback){
    appConfig=newAppConfig;
    fs.writeFile(path.join(__dirname,"../"+configName+'.json'), JSON.stringify(newAppConfig),
        function (err, success) {
            callback(err,success);
        })
};

module.exports.getAppConfigParam= function(name){
    if(!appConfig) return null;
    return appConfig[name];
};