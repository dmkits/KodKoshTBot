var path=require ('path');

var moment = require('moment');
var database=require('./database');

module.exports= function(app){
    app.get("/", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'main.html'));
    });
    app.get("/get_main_data", function(req, res){
        var outData = {};//main data
        var menuBar= [];//menu bar list
        outData.title= "BOT";
        database.connectToDB(function(DBConnectError){
            if (DBConnectError) outData.error= DBConnectError;
            menuBar.push({itemname:"menuBarItemDCards",itemtitle:"Дисконтные карты",
                action:"open",content:"/getClientsDCards", id:"ClientsDCardsTable",title:"Справочник дисконтных карт", closable:false});
            menuBar.push({itemname:"menuBarItemBotMsg",itemtitle:"Рассылка сообщений",
                action:"open",content:"/getBotMsgTable", id:"botMsgTable",title:"Рассылка сообщений (telegram bot) ", closable:false});
            menuBar.push({itemname:"menuBarClose",itemtitle:"Выход",action:"close"});
            menuBar.push({itemname:"menuBarAbout",itemtitle:"О программе",action:"help_about"});
            outData.menuBar= menuBar;
            outData.autorun= [];
            outData.autorun.push({menuitem:"menuBarItemDCards", runaction:1});
            res.send(outData);
        });
    });

    app.get("/getBotMsgTable", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'botMsgTable.html'));
    });


    var botMsgTableColumns=[
        {data: "ChID", name: "ChID", width: 100, type: "text",visible:false},
        {data: "DocDate", name: "Дата рассылки", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY"},
        {data: "Msg", name: "Текст сообщения", width: 400, type: "text"},
        {data: "MsgHours", name: "Часы рассылки", width: 100, type: "text"},
        {data: "SendHours", name: "Сообщения отправлены", width: 100, type: "text"},
    ];
    app.get('/botMsg/getDataForTable', function (req, res) {
        var outData = {};
        outData.columns = botMsgTableColumns;

        outData.items = [];
        var queryText="select ChID, DocDate, Msg, MsgHours, SendHours " +
            "from it_BotMessages;";
        database.executeMSSQLQuery(queryText, function(err,result){
            if(err){
                outData.error=err.message;
                res.send(outData);
                return;
            }
            outData.identifier="ChID";
            outData.items=result.recordset;  console.log("outData=",outData);
            res.send(outData);
        });
    });

    app.get('/botMsg/newDataForBotMsgTable', function (req, res) {
        setDataItemForTable({tableColumns:botMsgTableColumns,
                values:[new Date(),"","13,18","",""]},
            function(result){
                res.send(result);
            });
    });

    app.post("/botMsg/storeBotMsgTableData", function(req, res){
       var dataToInsert={};
        dataToInsert.tableName="it_BotMessages";
        dataToInsert.insData =req.body;
        var outData={};
        if(newData.ChID){
            prepareUpdateTableStatement(newData, function(err, res){

            });
            return;
        }
        dataToInsert.idFieldName="ChID";
        insDataItemWithNewID(dataToInsert, function(err, res){

        });

        // database.executeMSSQLQuery("update r_DCards set InUse='"+newData.InUse+"', ClientName='"+newData.ClientName+"', " +
        //     "PhoneMob='"+newData.PhoneMob+"' where DCardID='"+newData.DCardID+"'", function(err,result){   console.log("result=",result);
        //     if(err){
        //         outData.error=err;
        //         res.send(outData);
        //         return;
        //     }
        //     outData.updateCount=result.rowsAffected.length;
        //     var queryText="select ChID, DCardID, InUse, ClientName, PhoneMob " +
        //         "from r_DCards where DCardID='"+newData.DCardID+"'";
        //     database.executeMSSQLQuery(queryText, function(err,result){
        //         if(err){
        //             outData.error=err.message;
        //             res.send(outData);
        //             return;
        //         }
        //         outData.resultItem=result.recordset[0];
        //         res.send(outData);
        //     });
        // });
    });
};

function setDataItemForTable(params, resultCallback){
    var itemData={};
    for(var columnIndex=0; columnIndex<params.tableColumns.length; columnIndex++){
        var fieldName= params.tableColumns[columnIndex].data, value=params.values[columnIndex];
        if (value!=undefined) itemData[fieldName]=value;
    }
    resultCallback({item:itemData});
}


