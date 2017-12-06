const Util      = require('util')
const Inspect   = Util.inspect;
const Client    = require('bitcoin-core');
const Config    = require('../config');
const Settings  = require('../settings');
const Async = require('async');

const RpcConfig = {
  host:     Config.rpchost,  // Will be 127.0.0.1 by default
  username: Config.rpcuser,  // Opt, only if auth needed
  password: Config.rpcpass,  // Opt. mandatory if user is passed.
  port:     Config.rpcport,  // Will be 8443/8080 http(s)
};

// confirmations until a tx is stale
const STALE_TX_CONFS    = Settings.txStaleConfirmations;

// time in minutes to wait to check transactions
const REFRESH_TX_LIST   = Settings.timeToRefreshTxs;

// time in minutes to wait to check notification queue
const REFRESH_TX_NOTIFS = Settings.timeToRefreshNotifications;

let transactionNotificationQueue = [];
let transactionNotificationQueueBusy = false;

// Check for new transactions to add to notification queue
// -- add to notification queue if not done yet
let createTransactionWatcher = (DiscordClient) => {
  setInterval(()=> {
    if (transactionNotificationQueueBusy) {
      // console.log('\n#Timer -- Check Transactions -- BUSY\n');
      return true;
    }
    else {
      // console.log(`\n#Timer -- Check Transactions\n`);
    }

    const client = new Client(RpcConfig);
    client.listTransactions()
    .then((transactions) => {
      let txs = [];
      for (let tx of transactions) {

        // ignore if stale tx
        if (tx.confirmations >= STALE_TX_CONFS) {
          let txPurgeIndex = transactionNotificationQueue.findIndex(txNotif => {
            return !!(txNotif.txid == tx.txid && txNotif.category == tx.category)
          });

          if (txPurgeIndex !== -1) {
            console.log('!!! PURGING OLD TX');
            transactionNotificationQueue.splice(txPurgeIndex, 1);
          }
          continue;
        }

        // ignore if TXID && Category match
        let txNotifIndex = transactionNotificationQueue.findIndex(txNotif => {
          return !!(txNotif.txid == tx.txid && txNotif.category == tx.category)
        });

        if (txNotifIndex === -1) {
          console.log('Added TX Notif');
          console.log('TX', tx);
          transactionNotificationQueue.push({
            category: tx.category,
            account: tx.account,
            address: tx.address,
            amount: tx.amount,
            txid: tx.txid,
            notified: false
          });
        }
      }
    })
    .catch((err) => {
      console.log(`ERROR -- Unable to listtransactions\n\`${err.message}\``);
    });
  }, ((REFRESH_TX_LIST * 60) * 1000));
};


// Every 180 seconds check go through the notificationQueue and send out
// notifications to the pending parties...
let createTransactionQueue = (DiscordClient) => {
  setInterval(()=> {
    if (transactionNotificationQueueBusy) {
      console.log('\n#Timer -- Check Queue -- BUSY\n');
      return true;
    }
    else {
      console.log(`\n#Timer -- Check Queue -- [${transactionNotificationQueue.length}]\n`);
    }

    transactionNotificationQueueBusy = true;

    // Filter notifications that are empty or already sent
    let notifications = transactionNotificationQueue.filter((notif) => {
      return !!(notif.account !== '' && !notif.notified);
    });

    Async.mapSeries(notifications, (notif, callback) => {
      console.log(`notification::${notification.txid}\n--type:${notification.category}\n--address:${notification.address}\n--account:${notification.account}\n--amount:${notification.amount}`);

      try {
        let _memberId = notif.account;
        console.log(`...building notification for :: ${_memberId}`);
        DiscordClient.fetchUser(_memberId)
        .then((User) => {
          User.createDM()
          .then((DMChannel) => {
            let action        = notification.category,
                actionPrepos  = '',
                odnAmount     = Math.abs(notification.amount);

            if (notification.category === 'send') {
              action        = 'sent';
              actionPrepos  = 'from';
            }
            else if (notification.category === 'receive') {
              action        = 'received';
              actionPrepos  = 'to';
            }

            DMChannel.send(`beep-boop ODN Tipbot here! Just wanted to let you know that a transaction for you has been detected on the Obsidian blockchain!\n\nYou ${action} \`${odnAmount} ODN\` ${actionPrepos} your ODN Tipbot Wallet: \`${notification.address}\`\nTXID: ${notification.txid}`)
            .then(message => {
              console.log(`...notification sent to user :: ${_memberId}`);
              message.react("🚀");
              notif.notified = true;
              setTimeout(()=> {
                console.log('-next notif\n');
                callback();
              }, 700);
            }).catch(err => {
              console.log(`!! ERR !! [2] Transaction Notif Error\n${err.message}\n`);
              setTimeout(()=> {
                console.log('-next notif|error\n');
                callback();
              }, 700);
            });
          });
        })
      } catch (err) {
        console.log(`!! ERR !! [1] Transaction Notif Error\n${err.message}\n`);
        setTimeout(()=> {
          console.log('-next notif|error\n');
          callback();
        }, 700);
      }
    }, (err, result) => {
      if (err) {
        console.log('!! TransactionQueue Err !!');
        console.log(err);
      }

      console.log('!! TransactionQueue Complete !!');
      // console.log(JSON.stringify(result));
    });

    transactionNotificationQueueBusy  = false;
  }, ((REFRESH_TX_NOTIFS * 60) * 1000));
};

module.exports = {
  setupNotifications: (DiscordClient) => {
    createTransactionWatcher(DiscordClient);
    createTransactionQueue(DiscordClient);
    console.log('Notification watchers setup');
  }
};
