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

const STALE_TX_CONFS    = 3; // confirmations until a tx is stale
const REFRESH_TX_LIST   = 0.5; // minutes
const REFRESH_TX_NOTIFS = 1.2; // minutes

let transactionNotificationQueue = [];
let transactionNotificationQueueBusy = false;

// Every 60 seconds check for new transactions to add to notification queue
// -- add to notification queue if not done yet
let createTransactionWatcher = () => {
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
        console.log('TX', tx);

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

        console.log(`txNotifIndex::${txNotifIndex}`);
        if (txNotifIndex === -1) {
          console.log('Added TX Notif');
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
let createTransactionQueue = () => {
  setInterval(()=> {
    if (transactionNotificationQueueBusy) {
      console.log('\n#Timer -- Check Queue -- BUSY\n');
      return true;
    }
    else {
      console.log(`\n#Timer -- Check Queue -- [${transactionNotificationQueue.length}]\n`);
    }

    transactionNotificationQueueBusy = true;
    for (let notification of transactionNotificationQueue) {
      // console.log(`notification::${notification.txid} --\ntype:${notification.category}\naddress:${notification.address}\naccount:${notification.account}\namount:${notification.amount}`);
      if (notification.account === '') {
        // console.log('...no account available for notification, skipping');
        continue;
      }

      if (notification.notified) {
        // console.log('...already notified');
        continue;
      }

      try {
        // TODO alter the special splitter between memberName and memberId
        memberId = notification.account;
        // console.log(`txName:${memberName}\nmemId:${memberId}`);
        client.fetchUser(memberId)
        .then((User) => {
          // console.log('--user GET');
          User.createDM()
          .then((DMChannel) => {
            // console.log('--dmchannel GET');
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

            DMChannel.sendMessage(`beep-boop ODN Tipbot here! Just wanted to let you know that a transaction for you has been detected on the Obsidian blockchain!\n\nYou ${action} \`${odnAmount} ODN\` ${actionPrepos} your ODN Tipbot Wallet: \`${notification.address}\`\nTXID: ${notification.txid}`)
            .then(message => {
              console.log(`Transaction Notif sent to user: ${memberName}`);
              message.react("🚀");
              notification.notified = true;
            }).catch(err => {
              console.log(`Transaction Notif ERR -- ${err.message}`);
            });
          });
        })
      } catch (err) {
        console.log(`Notif ERR: ${err.message}`);
      }
    }

    // transactionNotificationQueue      = [];
    transactionNotificationQueueBusy  = false;
  }, ((REFRESH_TX_NOTIFS * 60) * 1000));
};

module.exports = {
  setupNotifications: () => {
    createTransactionWatcher();
    createTransactionQueue();
    console.log('Notification watchers setup');
  }
};
