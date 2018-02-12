var path=require ('path');
var database=require('./database');
var appConfig=require('./appConfig');

module.exports= function(app) {

    app.get("/sysadmin", function(req, res){
        res.sendFile(path.join(__dirname, '../pages', 'sysadmin.html'));
    });
    app.get("/sysadmin/app_state", function(req, res){
        var outData= {};

        outData.mode= process.argv[2] || "config";

        outData.port=appConfig.getAppConfigParam("appPort");
        outData.connUserName=appConfig.getAppConfigParam("dbUser");
        outData.configuration= appConfig.getAppConfigParams();

        database.connectToDB(function(DBConnectError){
            if (DBConnectError)
                outData.dbConnection= DBConnectError;
            else
                outData.dbConnection='Connected';
            res.send(outData);
        });
    });

    app.get("/sysadmin/startup_parameters", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/sysadmin', 'startup_parameters.html'));
    });

    app.get("/sysadmin/startup_parameters/get_app_config", function (req, res) {
        var appConfigParams=appConfig.getAppConfigParams();
        var outData={};
        for(var i in appConfigParams){
            var param=appConfigParams[i];
            if(typeof param=='object' && !Array.isArray(param)){
                var innerObjKeysArr=Object.keys(param);
                for(var k in innerObjKeysArr){
                    outData[i+"_"+innerObjKeysArr[k]]=param[innerObjKeysArr[k]];
                }
            }else outData[i]=param;
        }
        res.send(outData);
    });
    app.get("/sysadmin/startup_parameters/load_app_config", function (req, res) {
        try{
            var appConfigParams=appConfig.loadAppConfig();
        }catch(e){
            res.send({error:"Failed load App Config! Reason: "+e.message});
            return;
        }

        if(appConfigParams.error){
        }
        var outData={};
        for(var i in appConfig){
            var param=appConfig[i];
            if(typeof param=='object' && !Array.isArray(param)){
                var innerObjKeysArr=Object.keys(param);
                for(var k in innerObjKeysArr){
                    outData[i+"_"+innerObjKeysArr[k]]=param[innerObjKeysArr[k]];
                }
            }else outData[i]=param;
        }
        res.send(outData);
    });
    app.post("/sysadmin/startup_parameters/store_app_config_and_reconnect", function (req, res) {
        var receivedAppConfig = req.body;
        var outData = {};
        var newRefactoredAppConfig={};
        for(var i in receivedAppConfig){
            if(i.indexOf("_")>=0){
                var propName=i.substr(0,i.indexOf("_"));
                if(!newRefactoredAppConfig[propName]) newRefactoredAppConfig[propName]={};
                var innerPropName=i.substr(i.indexOf("_")+1);
                newRefactoredAppConfig[propName][innerPropName]=receivedAppConfig[i];
            }else  newRefactoredAppConfig[i]=receivedAppConfig[i];
        }
        appConfig.rewriteAppConfig(newRefactoredAppConfig,function(err){
            if(err){
                outData.error=err;
                res.send(outData);
                return;
            }
            database.connectToDB(function(err){
                if(err){
                    outData.DBConnectError=err;
                    res.send(outData);
                    return;
                }
                res.send(outData);
            })
        });
    });
};