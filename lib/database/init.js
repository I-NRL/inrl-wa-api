const {
  DataTypes
} = require("sequelize");
const config = require("../../config");
const database = config.DATABASE.define("database", {
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  basic: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  session: {
    type: DataTypes.STRING,
    allowNull: true
  },
  jid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  started: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
});
module.exports = database;