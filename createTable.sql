CREATE TABLE it_BotMessages(
	ChID int PRIMARY KEY NOT NULL,
    DocDate datetime NOT NULL,
    Msg varchar(25) NOT NULL,
    MsgHours VARCHAR(200) NOT NULL,
    SendHours VARCHAR(200))
GO