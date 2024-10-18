// Import the "Function" object from the library
const {plugin} = require("../lib/");

// Define a new function using "Function"
plugin({
    pattern: "getjid",
    fromMe: true,
    desc: "Get all group JIDs",
    type: "whatsapp"
}, async (message, _) => {
    const groups = await message.client.groupFetchAllParticipating();
    const groupArray = Object.entries(groups).map(([key, value]) => value);
    let response = "";
    for (let group of groupArray) {
        response += `*_Group:_* ${group.subject}\n*_JID:_* ${group.id}\n\n`;
    }
    message.send(response);
});
