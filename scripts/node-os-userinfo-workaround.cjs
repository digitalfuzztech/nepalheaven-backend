const os = require("node:os");
const { syncBuiltinESMExports } = require("node:module");

const originalUserInfo = os.userInfo;
const originalHomedir = os.homedir;

os.userInfo = function guardedUserInfo(options) {
  try {
    return originalUserInfo(options);
  } catch (error) {
    if (error?.code !== "ENOMEM" && error?.info?.code !== "ENOMEM") throw error;
    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || "local-user",
      homedir: process.env.USERPROFILE || process.cwd(),
      shell: null,
    };
  }
};

os.homedir = function guardedHomedir() {
  try {
    return originalHomedir();
  } catch (error) {
    if (error?.code !== "ENOMEM" && error?.info?.code !== "ENOMEM") throw error;
    return process.env.USERPROFILE || process.cwd();
  }
};

syncBuiltinESMExports();
