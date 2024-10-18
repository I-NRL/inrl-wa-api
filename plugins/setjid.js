const {plugin} = require("../lib");
const database = require("../lib/database/init");
// Define a new function using "Function"
plugin({
    pattern: "setjid",
    fromMe: true,
    desc: "set group jid",
    type: "whatsapp"
}, async (message, _) => {
    if(!_) return await message.send("privide a jid");
    const db = await database.findOne();
    await db.update({
        jid: _.trim()
    })
    return await message.send(`succuss fully set jid: ${_}`);
});
