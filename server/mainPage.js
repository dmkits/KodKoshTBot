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
            menuBar.push({itemname:"menuBarItemBotMsg",itemtitle:"Рассылка сообщений",
                action:"open",content:"/getBotMsgTable", id:"botMsgTable",title:"Рассылка сообщений (telegram bot) ", closable:false});
            menuBar.push({itemname:"menuBarItemDCards",itemtitle:"Дисконтные карты",
                action:"open",content:"/getClientsDCards", id:"ClientsDCardsTable",title:"Справочник дисконтных карт", closable:false});
            menuBar.push({itemname:"menuBarClose",itemtitle:"Выход",action:"close"});
            menuBar.push({itemname:"menuBarAbout",itemtitle:"О программе",action:"help_about"});
            outData.menuBar= menuBar;
            outData.autorun= [];
            outData.autorun.push({menuitem:"menuBarItemBotMsg", runaction:1});
            outData.autorun.push({menuitem:"menuBarItemDCards", runaction:2});
            res.send(outData);
        });
    });

};



