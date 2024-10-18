const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const pino = require("pino");
const ffmpeg = require("fluent-ffmpeg");
const config = require('../config');
const database = require('./database/init');
const {handler} = require('./handler');

const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const platform = `${os.platform()}-${os.arch()}`;
const optionalDependencies = {
  '@ffmpeg-installer/darwin-arm64': "4.1.5",
  '@ffmpeg-installer/darwin-x64': "4.1.0",
  '@ffmpeg-installer/linux-arm': "4.1.3",
  '@ffmpeg-installer/linux-arm64': "4.1.4",
  '@ffmpeg-installer/linux-ia32': "4.1.0",
  '@ffmpeg-installer/linux-x64': "4.1.0",
  '@ffmpeg-installer/win32-ia32': "4.1.0",
  '@ffmpeg-installer/win32-x64': "4.1.0"
};
const packageName = `@ffmpeg-installer/${platform}`;
if (optionalDependencies[packageName]) {
  const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const libPath = path.join(__dirname);
const files = fs.readdirSync(libPath);
const exportedModules = {};
exportedModules.connect = async() => {
  try {
    await config.DATABASE.sync();
      const existing = await database.findOne();
      if(fs.existsSync("./lib/session") || !fs.existsSync("./lib/session/creds.json")) {
        const {data} = await axios.post(config.BASE_URL+'get_session', {
          id: config.SESSION_ID
        });
        if(!data.status) {
    
        } else {
          console.log("Data fetched succsusfully");
          const auth = data.result;
          if(!fs.existsSync("./lib/session")) fs.mkdirSync("./lib/session");
          for (const key of Object.keys(auth)) {
            if(key == "creds.json") fs.writeFileSync(`./lib/session/${key}`, JSON.stringify(auth[key]));
          };
        }
      };
      if(!existing) {
        await database.create({
          status: true, 
          session: config.SESSION_ID
        });
      } else {
        await existing.update({
          status: true, 
          session: config.SESSION_ID
        });
      };
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState("./lib/session");
    const logger = pino({ level: "silent" });
    const waSocket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: true,
      logger,
      emitOwnEvents: true,
      version,
      getMessage: async () =>
        { conversation: null },
    });
    waSocket.ev.on("creds.update", saveCreds);
    console.log('external plugins installed successfully')
    fs.readdirSync("./plugins").forEach((plugin) => {
      if (path.extname(plugin).toLowerCase() == ".js") {
        try {
          require("../plugins/" + plugin);
        } catch (e) {
          console.log(e)
          fs.unlinkSync("./plugins/" + plugin);
        }
      }
    });
    waSocket.ev.on('connection.update', async({connection})=> {
      if(connection == 'closed') {
        console.log("❗ connection closed ❗")
      } else if(connection == 'open') {
        const info = await database.findOne();
        if(info.started) {
          console.log("⭕ service restarted ⭕");
          return await waSocket.sendMessage(waSocket.user.id, {text: 'service restarted'});
        };
        await info.update({started: true});
        await waSocket.sendMessage(waSocket.user.id, {text: 'record saved'});
        return console.log('bot connected');
      } else if(connection == 'connecting') console.log('💫 connecting please wait 💫');
    });
    return handler(waSocket);
  } catch (e) {
    console.log(e);
  }
}

files.forEach(file => {
  const filePath = path.join(libPath, file);
  const stats = fs.statSync(filePath);

  if (stats.isFile() && path.extname(file) === '.js') {
    const moduleName = path.basename(file, '.js');
    const requiredModule = require(filePath);

    if (typeof requiredModule === 'object') {
      for (const functionName in requiredModule) {
          exportedModules[functionName] = requiredModule[functionName];
        }
    } else {
      exportedModules[moduleName] = requiredModule;
    }
  }
});
exportedModules.runServer();
module.exports = exportedModules;