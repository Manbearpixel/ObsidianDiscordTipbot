const Util      = require('util')
const Inspect   = Util.inspect;
const Client    = require('bitcoin-core');
const Config    = require('../config');

const RpcConfig = {
  host:     Config.rpchost,  // Will be 127.0.0.1 by default
  username: Config.rpcuser,  // Opt, only if auth needed
  password: Config.rpcpass,  // Opt. mandatory if user is passed.
  port:     Config.rpcport,  // Will be 8443/8080 http(s)
};

let Obsidian = {};
Obsidian.getAccountAddress = (accountId) => {
  console.log('Obsidian.getAccountAddress');
  return new Promise((resolve, reject) => {
    const client = new Client(RpcConfig);
    client.getAccountAddress(accountId)
    .then((addr) => {
      // console.log(addr);
      resolve(addr);
    })
    .catch((err) => {
      console.log(err);
      reject(err);
    });
  });
};

Obsidian.getAddressesByAccount = (accountId) => {
  console.log('Obsidian.getAddressesByAccount');
  return new Promise((resolve, reject) => {
    const client = new Client(RpcConfig);
    client.getAddressesByAccount(accountId)
    .then((addresses) => {
      // console.log(Inspect(addresses, {showHidden: false, depth: null}));
      resolve(addresses);
    })
    .catch((err) => {
      console.log(err);
      reject(err);
    });
  });
};

Obsidian.sendFrom = (accountId, odnAddress, amount) => {
  console.log('Obsidian.sendFrom');
  return new Promise((resolve, reject) => {
    const client = new Client(RpcConfig);
    client.sendFrom(accountId, odnAddress, amount)
    .then((txId) => {
      // console.log(Inspect(txId, {showHidden: false, depth: null}));
      resolve(txId);
    })
    .catch((err) => {
      console.log(err);
      reject(err);
    });
  });
};

Obsidian.getBalance = (accountId) => {
  console.log('Obsidian.getBalance');
  return new Promise((resolve, reject) => {
    const client = new Client(RpcConfig);
    client.getBalance(accountId)
    .then((balance) => {
      // console.log(Inspect(balance, {showHidden: false, depth: null}));
      resolve(balance);
    })
    .catch((err) => {
      console.log(err);
      reject(err);
    });
  });
};

module.exports = Obsidian;
