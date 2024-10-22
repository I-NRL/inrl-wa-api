const {
  proto,
  prepareWAMessageMedia,
  generateWAMessageFromContent
} = require("@whiskeysockets/baileys");
let commands = [];
function plugin(info, func) {
  commands.push({...info, function: func});
  return info;
};
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
async function sendFirstMessage(m, session, data) {
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
    userJid: session.user.id,
  });
  await session.relayMessage(m.sender, optional.message, {
    messageId: optional.key.id,
  });
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
module.exports = {commands, plugin, binarySearch, sendCard, sendFirstMessage};
