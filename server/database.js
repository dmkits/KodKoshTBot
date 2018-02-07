var mssql=require('mssql');
var fs= require('fs');
var path=require('path');
var DbConnectionError=null;
var configName=null;
var logger=require('./logger')();

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
            callback(err);
            DbConnectionError=err;
            logger.error("FAILED to connect to DB. Reason: "+err);
            return;
        }
        var request = new mssql.Request();
        request.query('select 1',
            function(err,res) {
                if (err) {
                    DbConnectionError = err;
                    callback(err);
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

module.exports.getAppConfig=function(){
   var appConfig;
    try{
        appConfig=JSON.parse(fs.readFileSync(path.join(__dirname,"../"+configName+'.json')))
    }catch(e){
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

module.exports.getClientsFor=function(callback){
    var request = new mssql.Request();
    request.query("select TChatID from r_Emps where ShiftPostID=1 and LTRIM(ISNULL(Mobile,''))<>'' and LTRIM(ISNULL(TChatID,''))<>''",
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            if(!res.recordset || res.recordset.length==0){
                callback({err:"Не удалось найти ни одного номера телефона в справочнике администраторов."});
                return;
            }
            callback(null,res.recordset);
        });
};
