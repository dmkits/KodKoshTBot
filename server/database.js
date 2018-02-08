var mssql=require('mssql');
var fs= require('fs');
var path=require('path');
var DbConnectionError=null;
var configName=null;
var logger=require('./logger')();


var dbConfig;
var dbConfigFilePath;

module.exports.getDbConnectionError= function(callback){
   setImmediate(function(){
       callback(DbConnectionError);
   });
};

module.exports.connectToDB=function(callback){
    var appConfig=this.getAppConfig();
    mssql.close();
    mssql.connect({
        "user": appConfig.dbUser,
        "password": appConfig.dbPassword,
        "server": appConfig.dbHost,
        "database": appConfig.database
    }, function(err){
        if(err){
            callback(err.message);
            DbConnectionError=err.message;
            logger.error("FAILED to connect to DB. Reason: "+DbConnectionError);
            return;
        }
        var request = new mssql.Request();
        request.query('select 1',
            function(err,res) {
                if (err) {
                    DbConnectionError = err.message;
                    callback(DbConnectionError);
                    return;
                }
                DbConnectionError=null;
                 callback();
            });
    });
};

module.exports.setAppConfig=function(configFileName){
    configName = configFileName;
};

module.exports.rewriteAppConfig=function(newAppConfig,callback){
   // configName = configFileName;
    fs.writeFile(path.join(__dirname,"../"+configName+'.json'), JSON.stringify(newAppConfig),
        function (err, success) {
        callback(err,success);
    })
};


module.exports.getAppConfig=function(){
   var appConfig={};
    try{
        appConfig=JSON.parse(fs.readFileSync(path.join(__dirname,"../"+configName+'.json')))
    }catch(e){
        appConfig.error=e;
        logger.error("FAILED to get data from config file. Reason: "+ e);
    }
   return appConfig;
};

module.exports.checkPhoneAndWriteChatID=function(phoneNum, chatId, callback){
    var request = new mssql.Request();
    request.input('PhoneMob', phoneNum);
    request.query('select DCardID from r_DCards WHERE PhoneMob=@PhoneMob',
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            var employeeDataArr  =res.recordset;
            request.input('TChatID', chatId);
            request.query('update r_DCards set TChatID=@TChatID where PhoneMob=@PhoneMob',
                function(err, res){
                    if(err){
                        callback(err);
                        return;
                    }
                    callback(null,employeeDataArr);
                });
    })
};

module.exports.getClientsForSendingMsg=function(callback){
    var request = new mssql.Request();
    request.query("select TChatID from r_DCards where LTRIM(ISNULL(PhoneMob,''))<>'' and LTRIM(ISNULL(TChatID,''))<>''",
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            if(!res.recordset || res.recordset.length==0){
                callback({err:"Не удалось найти ни одного клиента для рассылки сообщений."});
                return;
            }
            callback(null,res.recordset);
        });
};


module.exports.loadConfig=function(){
    // var configFileName=process.argv[2] || "config";
    dbConfigFilePath=path.join(__dirname,'../' + configName + '.cfg');
    var stringConfig = fs.readFileSync(dbConfigFilePath);
    dbConfig = JSON.parse(stringConfig);
};

module.exports.executeQuery=function(queryText,callback){
    var request = new mssql.Request();
    request.query(queryText,
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            callback(null, res);
        });
};