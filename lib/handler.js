const database = require('./database/init');
const {
  proto,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const {Boom} = require('@hapi/boom');
const { makeInMemory } = require("./store");
const {events} = require('./web');
const msgs = require('./database/msg');
const serialize = require('./serialize');
let commands = [];
function plugin(info, func) {
  commands.push({...info, function: func});
  return info;
};
const config = require('../config');
function binarySearch(array, targetPattern) {
    let left = 0;
    let right = array.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midPattern = array[mid].pattern;

        if (targetPattern.startsWith(midPattern)) {
            return mid;
        } else if (midPattern < targetPattern) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
};

const handler = async(conn) => {
  const store = makeInMemory(conn);
  events.on("product-update", async(data) => {
    const {jid} = await database.findOne();
    if(!jid) return console.log("jid not provideed");
    return await sendCard(jid, conn, data);
  });
  commands.sort((a, b) => a.pattern.localeCompare(b.pattern));
  conn.ev.on('messages.upsert', (m)=> onMessage(m, conn, store));
};

async function onMessage(messages, conn, store) {
  if (messages.messages[0].key.remoteJid == "status@broadcast") return;
  if (messages.type !== "notify") return;
  const m = new serialize(messages.messages[0], conn,"", store);
  if(!m.body) return;
  if(!m.isGroup) {
    const exist = await msgs.findOne({
      where: {jid: m.sender}
    });
    if(!exist) {
      const data = await database.findOne();
      if(data && data.basic && data.basic.ig) {
        await msgs.create({jid: m.sender});
        const Button = [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Instagram",
              url: data.basic.ig,
              merchant_url: data.basic.ig,
            })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "website",
              url: data.basic.page,
              merchant_url: data.basic.page,
            })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "group",
              url: data.basic.wa,
              merchant_url: data.basic.wa,
            })
          }
        ];
        const mess = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({text: "Thank you for your message! Our team will reach out to you shortly with the next steps and updates on your purchase." }),
                footer: proto.Message.InteractiveMessage.Footer.create({text: data.basic.name }),
                header: proto.Message.InteractiveMessage.Header.create({ 
                  title: "I-nrl",
                  subtitle: "WhatsApp Bot",
                  hasMediaAttachment: false
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create(
                  {
                    buttons: Button,
                  }
                ),
              }),
            },
          },
        };
        let optional = generateWAMessageFromContent(m.sender, mess, {
          userJid: conn.user.id,
        });
        await conn.relayMessage(m.sender, optional.message, {
          messageId: optional.key.id,
        });
      }
    };
  }
  console.log('[MESSAGE]:', m.body && m.body.length ? m.body : m.type);
  const isWithPrefix = m.body.startsWith(config.PREFIX);
  if(isWithPrefix) {
  const info = binarySearch(commands, m.body.replace(config.PREFIX, '').trim().toLowerCase());
  if(info == -1) return;
  if(commands[info].fromMe && !m.fromMe) return;
  console.log("An excutble command renderd");
  await commands[info].function(m, m.body.replace(config.PREFIX,'').replace(commands[info].pattern,"").trim());
  } else {
    for(const a in commands) {
      if(commands[a].on && commands[a].on == m.mediaType) {
        commands[a].function(m, m.body);
        break;
      }
    }
  }
}
async function sendCard(jid, session, card) {
  if(!card || !card.img) return;
  const cards = await Promise.all(card.img.map(async(a, i)=> ({
      body: proto.Message.InteractiveMessage.Body.fromObject({
              text: `*${card.subtitle}*\n\n*Price: ${card.discountPrice}* ~${card.price}~\n\n*additionaly extra ${card.offers}offers for you*`,
      }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({
              text: card.seller_name,
      }),
      header: {
              title: "inrl",
              hasMediaAttachment: true,
              ...(await prepareWAMessageMedia(
                  { image: { url: a } },
                  { upload: session.waUploadToServer },
              )),
      },
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
              buttons: [
                  {
                      name: "cta_url",
                      buttonParamsJson: JSON.stringify({
                          display_text: "CHEKOUT NOW",
                          url: card.display_url,
                          merchant_url: "",
                      }),
                  },
              ],
      }),
  })));
  const msg = generateWAMessageFromContent(
      jid,
      {
          viewOnceMessage: {
              message: {
                  messageContextInfo: {
                      deviceListMetadata: {},
                      deviceListMetadataVersion: 2,
                  },
                  interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                      body: proto.Message.InteractiveMessage.Body.fromObject({
                          text: `*${card.name}*\n\n\`\`\`${card.description}\`\`\``,
                      }),
                      footer: proto.Message.InteractiveMessage.Footer.fromObject({
                          text: `inrl`,
                      }),
                      header: proto.Message.InteractiveMessage.Header.fromObject({
                          title: "inrl",
                          subtitle: "inrl",
                          hasMediaAttachment: false,
                      }),
                      carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                          cards: cards,
                      }),
                  }),
              },
          },
      },
      {},
  );

  await session.relayMessage(jid, msg.message, {
      messageId: msg.key.id,
  });
}
module.exports = {commands, plugin, handler};