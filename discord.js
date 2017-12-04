// Load up the discord.js library
const Discord = require("discord.js");
const Tipbot  = require('./lib/tipbot');
const Notifications = require('./lib/notifications');

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Load config and settings
// config.token contains the bot's token
// config.prefix contains the message prefix.
const config    = require("./config.json");
const settings  = require("./settings.json");

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  
  client.user.setGame(`. Type !help for Tipbot`);
  if (settings.hasOwnProperty('notifications') && settings.notifications === true) {
    Notifications.setupNotifications(client);
  }
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.find('name', 'member-log');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`Welcome to the server, ${member}! We have an Obsidian Tipbot available here, type \`!help\` for usage!`);
});

client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.

  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;

  // Also good practice to ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;

  // Here we separate our "command" name, and our "arguments" for the command.
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if(command === 'help') {
    message.channel.send(Tipbot.helpMessage());
  }

  if(command === 'tip') {
    let request = args[0];
    console.log(request);

    if (request === 'deposit') {
      console.log('!!! Tip.Deposit !!!');
      try {
        let memberID = message.member.user.id;
        console.log(`member::${memberID}`);
        Tipbot.getOdnAddress(memberID)
        .then((Address) => {
          console.log(`address::`, Address);
          if (Address !== null) {
            message.channel.send(`<@${memberID}> ${Tipbot.depositMessage(Address)}`);
          }
          else {
            message.channel.send(Tipbot.errorMessage('Could not get ODN Address.'));
          }
        })
        .catch((err) => {
          console.log(err);
          message.channel.send(Tipbot.errorMessage('Could not get ODN Address.'));
        });
      } catch (err) {
        console.log(err);
        message.channel.send(Tipbot.errorMessage('Unable to deposit at this time.'));
      }
    }
    else if (request === 'balance') {
      console.log('!!! Tip.Balance !!!');
      try {
        let memberID = message.member.user.id;
        console.log(`member::${memberID}`);
        Tipbot.getOdnAddress(memberID)
        .then((Address) => {
          Tipbot.getOdnBalance(memberID)
          .then((Balance) => {
            message.channel.send(`<@${memberID}> ${Tipbot.balanceMessage(Address, Balance)}`);
          })
          .catch((err) => {
            console.log(err);
            message.channel.send(Tipbot.errorMessage('Could not get ODN Balance.'));
          });
        })
        .catch((err) => {
          console.log(err);
          message.channel.send(Tipbot.errorMessage('Could not get ODN Balance.'));
        });
      } catch (err) {
        console.log(err);
        message.channel.send(Tipbot.errorMessage('Unable to determine your balance at this time.'));
      }
    }
    else if (request === 'withdraw') {
      console.log('!!! Tip.Withdraw !!!');
      let [request, odnAddress, amount] = args;
      try {
        let memberID = message.member.user.id;
        console.log(`member::${memberID}`);
        Tipbot.withdrawOdn(memberID, odnAddress, amount)
        .then((Status) => {
          console.log('...Withdraw STATUS', Status);
          if (Status.status == 'success') {
            message.channel.send('Success!');
          }
          else {
            message.channel.send(`Could not complete withdraw -- ${Status.message}`);
          }
        })
        .catch((err) => {
          console.log(err);
          message.channel.send(Tipbot.errorMessage('Could not withdraw ODN.'));
        });
      } catch (err) {
        console.log(err);
        message.channel.send(Tipbot.errorMessage('Unable to withdraw ODN from your balance at this time.'));
      }
    }
    else if (request === 'party') {
      console.log('!!! Tip.party !!!');
      let [request, amount] = args;
      if (config.hasOwnProperty('party') && config.party === true) {
        try {
          let memberID = message.member.user.id;
          console.log(`member::${memberID}`);

          if (memberID !== config.adminId) {
            message.channel.send('beep boop Party mode can only be done by the party masters');
          }
          else {
            let members = message.channel.members.array().filter((member) => {
              return !!(!member.user.bot && member.id !== memberID);
            });

            console.log(`people here: ${members.length}`);
            console.log(`tip amount: ${amount}`);

            if (members.length === 0) {
              message.channel.send('beep boop -- Party cancelled, no one eligible!');
            }
            else {
              message.channel.send('beep boop -- Ignite the rocket to start the party!').then(questionMessage => {

                let collector = questionMessage.createReactionCollector(
                  (reaction, user) => {
                    console.log('---party validation---');
                    return !!(reaction.emoji.name === '🚀' && user.id === config.adminId)
                  }
                );

                collector.on('collect', (ele, collect) => {
                  console.log('---party validated---');
                  Tipbot.getOdnBalance(memberID)
                  .then((Balance) => {
                    let minOdn  = parseInt(members.length * parseInt(amount));
                    let minFees = parseFloat(members.length * parseFloat(settings.txFee));
                    let minBalance = (minOdn + minFees);
                    console.log(`---min ODN for party: ${minBalance}---\nODN: ${minOdn}\nFees:${minFees}`);

                    if (Balance < minBalance) {
                      message.channel.send(`not enough fuel! Party aborted. Requires ${minBalance} ODN`);
                    }
                    else {
                      message.channel.send('Starting the party!!!');

                      for (member of members) {
                        console.log(`sending party to ${member.id}`);

                        Tipbot.getOdnAddress(member.id)
                        .then((Address) => {

                          Tipbot.withdrawOdn(memberID, Address, amount)
                          .then((Status) => {
                            console.log('...Tip Party STATUS', Status);
                            if (Status.status == 'success') {
                              member.createDM()
                              .then((DMChannel) => {
                                DMChannel.send(`beep-boop ODN Tipbot here! You're going to be receiving ${amount} ODN for the Obsidian Tipbot party!`);
                              });
                            }
                            else {
                              console.log(`ERR occurred, unable to send ODN to member:${member.id}\n${Status.message}`);
                              message.channel.send(`Unable to share the party with <@${member.id}>`);
                            }
                          })
                          .catch((err) => {
                            console.log(`ERR occurred, unable to send ODN to member:${member.id}\n${Status.message}`);
                            message.channel.send(`Unable to share the party with <@${member.id}>`);
                          });
                        })
                        .catch((err) => {
                          console.log(`ERR occurred, unable to send ODN to member:${member.id}`);
                          message.channel.send(`Unable to share the party with <@${member.id}>`);
                        })
                      }
                    }
                  });
                });
              });
            }
          }
        }
        catch (err) {
          console.log(err);
          message.channel.send(Tipbot.errorMessage('Unable to start the party.'));
        }
      }
      else {
        message.channel.send('beep boop Party mode is not active!');
      }
    }
    else {
      console.log('!!! Tip !!!');

      try {
        let amount        = parseFloat(args[1]);
        let comment       = args.slice(2).join(' ');
        let memberID      = message.member.user.id;
        let discordUserID = message.mentions.users.first().id;

        if (isNaN(amount)) {
          throw new Error('Amount of ODN to tip must be a number!');
        }

        if (memberID === discordUserID) {
          throw new Error('You cannot tip yourself!');
        }

        console.log(`memberID :: ${memberID}`);
        console.log(`discordUserID :: ${discordUserID}`);
        console.log(`amount :: ${amount}`);
        console.log(`comment :: ${comment}`);

        Tipbot.getOdnAddress(discordUserID)
        .then((RecipientOdnAddress) => {
          console.log(`attempting to send tip to ${RecipientOdnAddress}`)

          Tipbot.withdrawOdn(memberID, RecipientOdnAddress, amount)
          .then((Status) => {
            console.log('...Withdraw STATUS', Status);
            if (Status.status == 'success') {
              message.channel.send(`Successfully sent <@${discordUserID}> ${amount} ODN from <@${memberID}>\n\nThe transaction should appear on the blockchain within the next few minutes:\n${settings.blockexplorerUrl}transaction/${Status.message}`);
            }
            else {
              message.channel.send(`Could not complete tip -- ${Status.message}`);
            }
          })
          .catch((err) => {
            console.log(err);
            message.channel.send('Error withdrawOdn');
          });
        });
      } catch (err) {
        console.log(err);
        message.channel.send(`Unrecognized command! --\n${Tipbot.helpMessage()}`);
      }
    }
  }
});

client.login(config.token);
