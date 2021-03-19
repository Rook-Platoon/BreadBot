const cheerio = require('cheerio')
const fetch = require('node-fetch');
const querystring = require('querystring');
const Discord = require('discord.js');
const config = require('./config.js');
const { resolve } = require('path');
const bot = new Discord.Client();
const token = config;
const PREFIX = '!';
let inaraData=[]
let fleetCarriers=[]
bot.on('ready', ()=>{
    //console message to show that the bot is online
    console.log('BreadBot lives!');
});

/////////////////////////// helper functions  not actually used in the bot /////////////////////////////
const trim = (str, max) => str.length > max ? `${str.slice(0, max - 3)}...` : str;
function getKey(rec) {
    if (rec.ed_market_id) return rec.ed_market_id;
    return getKey(rec[Object.keys(rec)[0]]);
}

bot.on('message', async message => {
	if (!message.content.startsWith(PREFIX) || message.author.bot) return;

	const args = message.content.slice(PREFIX.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'cat') {
        //fun command that posts a random cat picture
		const { file } = await fetch('https://aws.random.cat/meow').then(response => response.json());
		message.channel.send(file);
	}else if (command === 'system') {
        //command that prints info about a system
        if (!args.length) {
			return message.channel.send('You need to supply a search term!');
		}
		const query = querystring.stringify({ name: args.join(' ') });
        fetch(`https://elitebgs.app/api/ebgs/v5/systems?${query}`)
        .then(response => response.json())
        .then(json => {
            var response = "Name:"+json.docs[0].name+"\nControlling faction:"+json.docs[0].controlling_minor_faction_cased+"\nAllegiance:"+json.docs[0].allegiance;
            message.channel.send({embed: {
                color: 3447003,
                description: response
            }});
            });
            
    }else if(command === 'inara'){
        //command that prints info of our squadron's fleet carriers
        //gets the inara squadron FC page
        fetch('https://inara.cz/squadron-fleet-carriers/8829/')
        .then(res => res.text())
        .then(text => {
            var $ =cheerio.load(text)
            $('td.lineright').each(function(i,e){
                inaraData[i]=$(this).text()
            })
            for(var i=0; i<inaraData.length; i+=2){
                let fc=new FleetCarrier() 
                fc.name=inaraData[i].slice(0,-10)
                fc.id=inaraData[i].replace(/.*\(|\).*/g, '')
                fc.location=inaraData[i+1]
                fleetCarriers.push(fc)
            }
            asyncForLoop()
        })
        
        ///for loop async
        const asyncForLoop = async _ => {
            console.log('start')
            //searches carriers by the (H14-5JS) license plate 
            for (let i=0; i<fleetCarriers.length; i++) {
                let finished = fleetCarriers.length;
                let carrierID = fleetCarriers[i].id;
                let newquery = `search=${carrierID}`
                let carrier = fleetCarriers[i];
                var searchLink = await FetchLink(`https://inara.cz/search/search?${newquery}`)
                var $ =cheerio.load(searchLink)
                //gets the href tag
                $('div.mainblock > a.inverse').each(function(i,e){
                   searchLink = $(this).attr('href')
                })
                var searchResult = await FetchLink('https://inara.cz/'+searchLink)
                GetCommodities(searchResult, carrier);
            }
            console.log('end loop')
            //print the data here
            var response='';        
            response=Format_Discord_Message(fleetCarriers)
            Split_Discord_Message(response, message);
            
        }//end for loop async
    }
})//end of bot message

function FleetCarrier(){
    var name, id, location, owner, commodities;
}

async function FetchLink(url){
    let response = await fetch(url);
            return await response.text();
}
function GetCommodities(text, carrier){
    let commodities=[]
    $ =cheerio.load(text)
    if ($('tbody > tr > td').length) {
        $('tbody > tr > td').each(function(i,e){
            let result=$(this).text()
            commodities.push(result)
        })
        console.log('Commodities for '+carrier.name)
        carrier.commodities=commodities;
      } else {
        console.log('No market data for '+carrier.name)
      }
      return commodities;
}
function Format_Discord_Message(fleetCarrier){
    var response=""
    for (let i=0; i<fleetCarriers.length; i++) {
        let carrier = fleetCarriers[i]
        response +=`**${carrier.name} [${carrier.id}]** 🪐 ${carrier.location} \n`
        if(carrier.commodities!==undefined){
        for(let j=0; j<carrier.commodities.length; j+=5) {
        response +=`${carrier.commodities[j]}`
        if(carrier.commodities[j+1] =='') {
          response +=`---`  
        } else response +=` Sell:${carrier.commodities[j+1]}`;
        if(carrier.commodities[j+2] ==''){
            response +=`---`  
        }else  response +=` Buy:${carrier.commodities[j+2]} `;
        if(carrier.commodities[j+3] ==''){
            response +=`---`  
        }else  response +=` Demand:${carrier.commodities[j+3]} `;
        if(carrier.commodities[j+4] ==''){
            response +=`---`  
          }else response +=` Supply:${carrier.commodities[j+4]} \n`;                  
        }
        }else response +=`No Market Data \n`
    }
return response;
}

function Split_Discord_Message(response, message){
    var split = response.split("\n")
    var maxlen=40;
    for(var i=0;i<split.length; i+=maxlen){
    var msg=""
    for(var b=0;b<maxlen;b++){
        if(split[i+b]!== undefined)
        msg+=split[i+b]+'\n'
    }
    message.channel.send({embed: {
        color: 3447003,
        description: msg
    }})
    }
}
bot.login(token.token);