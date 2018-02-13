var database=require('./database');
var path=require('path'), moment=require('moment');

module.exports= function(app){
    app.get("/getBotMsgTable", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'botMsgTable.html'));
    });

    var botMsgTableColumns=[
        {data: "ChID", name: "Номер", width: 65, type: "numeric", readOnly:true},
        {data: "DocDate", name: "Дата рассылки", width: 100, type: "date", dateFormat:"DD.MM.YYYY", correctFormat:true, align:"center"},
        {data: "Msg", name: "Текст сообщения", width: 400, type: "text"},
        {data: "MsgHours", name: "Часы рассылки", width: 100, type: "text", align:"center"},
        {data: "SendHours", name: "Выполненные рассылки", width: 100, type: "text", align:"center", readOnly:true}
    ];
    app.get('/botMsg/getDataForTable', function (req, res) {
        database.getDataForTable({source:"it_BotMessages",
                tableColumns:botMsgTableColumns, identifier:botMsgTableColumns[0].data, conditions:req.query} ,
            function(result){
                res.send(result);
            });
    });
    app.get('/botMsg/newDataForBotMsgTable', function (req, res) {
        setDataItemForTable({tableColumns:botMsgTableColumns,
                values:[null,moment(new Date()).format("DD.MM.YYYY"),"Новое сообщение","13,18",""]},
            function(result){
                res.send(result);
            });
    });
    app.post("/botMsg/storeBotMsgTableData", function(req, res){
        database.storeTableDataItem({tableName:"it_BotMessages",idFieldName:"ChID",tableColumns:botMsgTableColumns,
                storeTableData:req.body}, function(result){
            res.send(result);
        })
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