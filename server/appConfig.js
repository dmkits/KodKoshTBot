var fs=require('fs'), path=require('path');

var configFileName=null;
var appConfig=null;

module.exports.setAppConfigName=function(configParamName){
    configFileName=configParamName;
};

module.exports.loadAppConfig=function(){
    appConfig=JSON.parse(fs.readFileSync(path.join(__dirname,"../"+configFileName+'.json')));
    if(!appConfig||!appConfig["sysadmins"]) return;
    var sysadmins= appConfig["sysadmins"];
    if(sysadmins&&typeof(sysadmins)=="string") {
        sysadmins= JSON.parse("[\""+sysadmins.replace(/,/g,"\",\"")+"\"]");
        appConfig["sysadmins"]= sysadmins;
    }
    if(sysadmins){
        for(var i=0; i<sysadmins.length;i++) {
            var sysadminTel= sysadmins[i];
            if(sysadminTel&&typeof(sysadminTel)=="string") sysadmins[i]=sysadminTel.trim();
        }
    }
    return appConfig;
};
module.exports.rewriteAppConfig=function(newAppConfig,callback){
    appConfig=newAppConfig;
    fs.writeFile(path.join(__dirname,"../"+configName+'.json'), JSON.stringify(newAppConfig),
        function (err, success) {
            callback(err,success);
        })
};

module.exports.getAppConfigParams= function(){
    return appConfig;
};
module.exports.getAppConfigParam= function(name){
    if(!appConfig) return null;
    return appConfig[name];
};
