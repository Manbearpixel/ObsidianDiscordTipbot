const Obsidian = require('./obsidian');
const settings = require("../settings.json");

const Commands = [
  {
    command:  '`tip`',
    title:    'Send another Discord user some Obsidian.',
    example:  '`!tip @somebody 10 <optional comment>`'
  },
  {
    command:  '`deposit`',
    title:    'Deposit Obsidian to your Tipbot Wallet.',
    example:  '`!tip deposit`'
  },
  {
    command:  '`withdraw`',
    title:    'Withdraw Obsidian from your Tipbot Wallet.',
    example:  '`!tip withdraw <your_personal_odn_address> <amount>`'
  },
  {
    command:  '`balance`',
    title:    'Check how much Obsidian is in your Tipbot Wallet.',
    example:  '`!tip balance`'
  }
];

const TxFee   = parseFloat(settings.txFee);
const MinSend = parseFloat(settings.minSend);

let Tipbot = {};
Tipbot.helpMessage = () => {
  let helpMsg = '';
  for (let helpCommand of Commands) {
    helpMsg = helpMsg + `${helpCommand.command} - ${helpCommand.title}\n${helpCommand.example}\n\n`;
  }
  return helpMsg;
};

Tipbot.getOdnAddress = (memberId) => {
  return new Promise((resolve, reject) => {

    Obsidian.getAddressesByAccount(memberId)
    .then((Addresses) => {
      console.log('...addresses');
      if (Addresses.length === 0) {
        Obsidian.getAccountAddress(memberId)
        .then((Address) => {
          console.log('getOdnAddress');
          console.log(Address);
          resolve(Address);
        })
        .catch(reject);
      }
      else {
        resolve(Addresses[0]);
      }
    });
  });
};

Tipbot.getOdnBalance = (memberId) => {
  return new Promise((resolve, reject) => {

    Obsidian.getBalance(memberId)
    .then((bal) => {
      console.log('...bal');
      resolve(bal);
    })
    .catch(reject);
  });
};

Tipbot.withdrawOdn = (memberId, odnAddress, withdrawAmt) => {
  withdrawAmt = parseFloat(withdrawAmt);

  return new Promise((resolve, reject) => {
    // check for proper withdrawAmt
    if (withdrawAmt < MinSend) {
      return resolve({ status: 'error', message: `Invalid withdraw! Minimum is ${MinSend} ODN.`});
    }

    // ensure amount withdrawing is allowed (withdrawAmt + fees) >= balance
    Tipbot.getOdnBalance(memberId)
    .then((Balance) => {
      console.log('withdaw CHECK...', withdrawAmt, TxFee, (withdrawAmt + TxFee), Balance);

      if ( (withdrawAmt + TxFee) >= Balance ) {
        return resolve({ status: 'error', message: `Your balance is insufficient for this transaction.\nBalance is ${Balance} ODN.\nTransaction Fee is ${TxFee} ODN.`});
      }

      Obsidian.sendFrom(memberId, odnAddress, withdrawAmt)
      .then((Result) => {
        console.log('.......sendfrom result?');
        console.log(Result);
        if (Result.length == 64) {
          resolve({ status: 'success', message: Result });
        }
        else {
          resolve({ status: 'error', message: Result });
        }
      }).catch(reject);
    }).catch(reject);
  });
};

Tipbot.errorMessage = (errorMsg) => {
  return `[beep boop] Tipbot Error!\n${errorMsg}`;
};

Tipbot.depositMessage = (odnAddress) => {
  let msg = `This is your personal ODN Tipbot Wallet Address:\n\`${odnAddress}\`\n\n*Do not store large amounts of ODN as it does not stake! The Obsidian Team is not held liable for lost ODN.*`;

  return msg;
};

Tipbot.balanceMessage = (odnAddress, balance) => {
  let msg = `Your balance for \`${odnAddress}\` is \`${balance}\` ODN.`;
  return msg;
};

Tipbot.withdrawMessage = (status, memberId, amount) => {


};



module.exports = Tipbot;
