var path=require ('path');
var database=require('./database');

module.exports= function(app) {
    app.get("/sysadmin", function(req, res){
        res.sendFile(path.join(__dirname, '../pages', 'sysadmin.html'));
    });
    app.get("/sysadmin/app_state", function(req, res){
        var outData= {};
        var appConfig=database.getAppConfig();
        if (appConfig.error) {
            outData.error= appConfig.error;
            res.send(outData);
            return;
        }
        outData.mode= process.argv[2] || "config";
        outData.port=appConfig.appPort;
        outData.connUserName=appConfig.dbUser;
        outData.configuration= appConfig;
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
        var appConfig=database.getAppConfig();
        if(appConfig.error){
            res.send({error:appConfig.error});
            return;
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
    app.get("/sysadmin/startup_parameters/load_app_config", function (req, res) {
        var appConfig=database.getAppConfig();
        if(appConfig.error){
            res.send({error:appConfig.error});
            return;
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
        database.rewriteAppConfig(newRefactoredAppConfig,function(err){
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

    app.get("/sysadmin/getDCards", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/sysadmin', 'dCardsTable.html'));
    });

    var sysDCardsTableColumns=[
        {data: "ChID", name: "ChID", width: 100, type: "text"},
        {data: "DCardID", name: "DCardID", width: 100, type: "text"},
        {data: "Discount", name: "Discount", width: 100, type: "text"},
        {data: "SumCC", name: "SumCC", width: 100, type: "text"},
        {data: "InUse", name: "InUse", width: 100, type: "text"},
        {data: "Notes", name: "Notes", width: 100, type: "text"},
        {data: "IsCrdCard", name: "IsCrdCard", width: 100, type: "text"},
        {data: "EDate", name: "EDate", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY HH:mm:ss" },
        {data: "ClientName", name: "ClientName", width: 100, type: "text"},
        {data: "DCTypeCode", name: "DCTypeCode", width: 100, type: "text"},
        {data: "BirthDate", name: "BirthDate", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY"},
        {data: "FactDistrict", name: "FactDistrict", width: 100, type: "text"},
        {data: "FactCity", name: "FactCity", width: 100, type: "text"},
        {data: "PhoneMob", name: "PhoneMob", width: 100, type: "text"},
        {data: "PhoneHome", name: "PhoneHome", width: 100, type: "text"},
        {data: "EMail", name: "EMail", width: 100, type: "text"},
        {data: "Status", name: "Status", width: 100, type: "text"},
        {data: "TChatID", name: "TChatID", width: 100, type: "text"},
    ];


    //ChID	CompID	DCardID	Discount	SumCC	InUse	Notes	Value1	Value2	Value3
    // IsCrdCard	Note1	EDate	ClientName	DCTypeCode	BirthDate	FactRegion	FactDistrict
    // FactCity	FactStreet	FactHouse	FactBlock	FactAptNo	FactPostIndex
    // PhoneMob	PhoneHome	PhoneWork	EMail	SumBonus	Status	TChatID

    app.get('/sysadmin/DCards/getDataForTable', function (req, res) {
        var outData = {};
        outData.columns = sysDCardsTableColumns;

        outData.items = [];
        var queryText="select ChID,DCardID,Discount,SumCC,InUse,Notes,IsCrdCard,EDate,ClientName,DCTypeCode " +
            "BirthDate,FactDistrict,FactCity,PhoneMob,PhoneHome,EMail,Status,TChatID " +
            "from r_DCards;";
       database.executeQuery(queryText, function(err,result){
           if(err){
               outData.error=err.message;
               res.send(outData);
               return;
           }
           outData.items=result.recordset;
           res.send(outData);
       });
    });


    // app.get("/sysadmin/reports_config", function (req, res) {
    //     res.sendFile(path.join(__dirname, '../pages/sysadmin', 'sql_queries.html'));
    // });
    // app.get("/sysadmin/sql_queries/get_reports_list", function (req, res) {
    //     var outData={};
    //     var configDirectoryName=common.getConfigDirectoryName();
    //     outData.jsonText =fs.readFileSync('./'+configDirectoryName+'/reports_list.json').toString();
    //     outData.jsonFormattedText = common.getJSONWithoutComments(outData.jsonText);
    //     res.send(outData);
    // });
    // app.get("/sysadmin/sql_queries/get_script", function (req, res) {
    //     var configDirectoryName=common.getConfigDirectoryName();
    //     var outData={};
    //     var sqlFile = './'+configDirectoryName+'/' + req.query.filename + ".sql";
    //     var jsonFile='./'+configDirectoryName+'/' + req.query.filename + ".json";
    //     if(fs.existsSync(sqlFile)){
    //         outData.sqlText = fs.readFileSync(sqlFile,'utf8');
    //     }else{
    //         fs.writeFileSync(sqlFile,"");
    //         outData.sqlText="";
    //     }
    //     if(fs.existsSync(jsonFile)){
    //         outData.jsonText = fs.readFileSync(jsonFile).toString();
    //     }else{
    //         fs.writeFileSync(jsonFile,"");
    //         outData.jsonText="";
    //     }
    //     res.send(outData);
    // });
    // app.post("/sysadmin/sql_queries/get_result_to_request", function (req, res) {
    //     var newQuery = req.body;
    //     var sUnitlist = req.query.stocksList;
    //     var bdate = req.query.bdate;
    //     var edate = req.query.edate;
    //     database.getQueryResult(newQuery, req.query,
    //         function (err,result) {
    //             var outData = {};
    //             if (err) {
    //                 outData.error = err.message;
    //                 res.send(outData);
    //                 return;
    //             }
    //             outData.result = result;
    //             res.send(outData);
    //         }
    //     );
    // });
    // app.post("/sysadmin/sql_queries/save_sql_file", function (req, res) {
    //     var configDirectoryName  = common.getConfigDirectoryName();
    //
    //     var newQuery = req.body;
    //     var filename = req.query.filename;
    //     var outData = {};
    //     var textSQL = newQuery.textSQL;
    //     var textJSON = newQuery.textJSON;
    //
    //     var formattedJSONText=common.getJSONWithoutComments(textJSON);
    //     if (textJSON) {
    //         var JSONparseERROR;
    //         try {
    //             JSON.parse(formattedJSONText);
    //         } catch (e) {
    //             outData.JSONerror = "JSON file not saved! Reason:" + e.message;
    //             JSONparseERROR = e;
    //         }
    //         if (!JSONparseERROR) {
    //             fs.writeFile("./"+configDirectoryName+"/" + filename + ".json", textJSON, function (err) {
    //                 if (textSQL) {
    //                     fs.writeFile("./"+configDirectoryName+"/" + filename + ".sql", textSQL, function (err) {
    //                         if (err) {
    //                             outData.SQLerror = "SQL file not saved! Reason:" + err.message;
    //                         } else {
    //                             outData.SQLsaved = "SQL file saved!";
    //                         }
    //                         if (err)outData.JSONerror = "JSON file not saved! Reason:" + err.message;
    //                         else outData.JSONsaved = "JSON file saved!";
    //                         outData.success = "Connected to server!";
    //                         res.send(outData);
    //                     });
    //                 }else {
    //                     if (err)outData.JSONerror = "JSON file not saved! Reason:" + err.message;
    //                     else outData.JSONsaved = "JSON file saved!";
    //                     outData.success = "Connected to server!";
    //                     res.send(outData);
    //                 }
    //             });
    //         } else {
    //             if (textSQL) {
    //                 fs.writeFile("./"+configDirectoryName+"/" + filename + ".sql", textSQL, function (err) {
    //                     if (err) {
    //                         outData.SQLerror = "SQL file not saved! Reason:" + err.message;
    //                     } else {
    //                         outData.SQLsaved = "SQL file saved!";
    //                     }
    //                     outData.success = "Connected to server!";
    //                     res.send(outData);
    //                 });
    //             }else{
    //                 outData.success = "Connected to server 192!";
    //                 res.send(outData);
    //             }
    //         }
    //     }
    // });
};