const {
    DataTypes
  } = require("sequelize");
  const config = require("../../config");
  const msgs = config.DATABASE.define("msgs", {
    jid: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });
  module.exports = msgs;