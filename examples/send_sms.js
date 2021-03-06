/* Usage: node send_sms.js /path/to/device xxxxyyzz "Foo Bar" */

function err(message) {
  console.log('Usage: node send_sms.js /path/to/device xxxxyyzz "Foo Bar"');
  process.exit();
}

    //------- Orange - C'est le premier port (control port) COM pour Tigo par les 3 (control, extension et voice)
    let portOrange = { controlCOMPort : 'COM10', voiceCOMPort : 'COM40', network : 'Orange', ussdCredit:'#123#' };
    //------- Tigo - C'est le premier port (control port) COM pour Tigo par les 3 (control, extension et voice)
    let portTigo = { controlCOMPort : 'COM50', voiceCOMPort : 'COM29', network : 'Tigo', ussdCredit:'#176#' };
        //------- Expresso - C'est le premier port (control port) COM pour Tigo par les 3 (control, extension et voice)
    let portExpresso = { controlCOMPort : 'COM22', voiceCOMPort : 'COM29', network : 'Expresso', ussdCredit:'*222#' };
        //------- Expresso - C'est le premier port (control port) COM pour Tigo par les 3 (control, extension et voice)
    let portExpr2 = { controlCOMPort : 'COM53', voiceCOMPort : 'COM29', network : 'Expresso', ussdCredit:'*222#' };
    let portYouss = { controlCOMPort : 'COM55', voiceCOMPort : 'COM29', network : 'Tigo Youss', ussdCredit:'#176#' };

    // lauchOne( portOrange );
    // lauchOne( portTigo );
    // lauchOne( portExpresso );
    lauchOne( portYouss );

function lauchOne( portObj ) {
  var modem = require('../index.js').Modem();
  modem.open(portObj.controlCOMPort, function() {
      
    let destinataire = '772482301';
    // destinataire = '704972153';
    let str = "Bonjour Mr. Je suis la et vous comment-allez-vous. Je suis alle chez vous mais votre femme ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo.";
    str = 'Bonjour';

    let sms = {};
    sms.text = str + ' ' + portObj.network;
    sms.receiver = destinataire;
    // sms.encoding = '16bit';
     
    modem.sms(sms, function (code, err, references) {
        console.log( 'Arguments :', arguments );                         
        
        if( code === 0 ){
            console.log( portObj.network, ':', "Erreur pendant l'envoi : " + err + '.' ); 
        }else{
            console.log( portObj.network, ':', "Message envoyé." );                         
        } 
    });

    modem.getMessages(function (messages) {
        console.log(portObj.network +  ' : ' + 'Messages sur le port ' 
        + portObj.controlCOMPort, ':', messages.length );
       

        for( var i = 0, len = messages.length; i < len; i++ ){
            console.log('----------', ( messages[i].isDeliveryReport ? 'Delivery' : 'Simple sms' ) );
            console.log( 'Message', messages[i].index, ' - ', messages[i].status );
            console.log( 'Sender :', messages[i].speaker );
            console.log( 'Contenu :', decodeGSM0338( messages[i].text ) ); 
            console.log( '\n' );

            // if( ! ('' + messages[i].index).match(/2|3|4|5|6/gi) ){
            //      modem.deleteMessage( messages[i].index, function () {
            //         console.log( 'Suppression :', arguments );
            //      } );
            // }
        }
    }, 'received');  

    modem.on('delivery', function (report) {
        console.log(portObj.network +  ' : ' + 'Accusé de reception sur le port ' + portObj.controlCOMPort ); 
        console.log(report); 
    });  


    modem.on('memory full', function (params) {
        console.log( portObj.network +  ' : mémoire pleine.' + params );
    });
    
    // modem.execute('AT+CMGF=0');
    // modem.execute('AT+CSCS="GSM"');

    // goWithUssd( modem, portObj.ussdCredit, function(response, escape_char){
    //     console.log( 'Response :', response, escape_char );
    // } );

    modem.on('sms received', function( message ) {
        console.log( 'Sms received ...', message );     
        //--------------------------
        // console.log( 'Message reçu sur le reseau ', portObj.network + '.' );                     
        // console.log( 'Envoyeur :', message.sender );
        // console.log( 'Centre de messagerie :', message.smsc );                     
        // // console.log( 'Contenu :', decodeGSM0338( message.text ) );
        //  console.log( 'Contenu :', message.text );                   

    });

    console.log( 'Port opened...' );

  });

}

/**
 * Execute un USSD
 * @param {*} ussdCode 
 * @param {*} callback 
 */
function goWithUssd( modem, ussdCode, callback ) {
    var Session = require('../index.js').Ussd_Session; 
    var CheckBalance = function() {
        var session = Session();
        // session.callback = c;
        
        session.on('close', function() {
            console.log('USSD session is closed');
        });

        session.parseResponse = function(response_code, message) {
            console.log( '-- Response USSD --' );
            if( callback ){
                callback( response_code, message );          
            }
            // var match = message.match(/([0-9,\,]+)\sRial/);
            // if(!match) {
            //     if(this.callback) 
            //         this.callback(false);
            //     return ;
            // }
                        
            // if(this.callback)
            //     this.callback(match[1]);
    
            // session.modem.credit = match[1];
                this.close();
        }; 
            
        //------------------------
        session.execute = function() {
            console.log( 'Execution du code USSD :', ussdCode );
            session.query( ussdCode, session.parseResponse );
        };
                    
        return session;
    };
    //----------- END
    let s = CheckBalance();
    s.modem = modem;
    s.start();
}



/** 
 * Decode un SMS car un sms est encodé en GSM 0338.
 * @param {*} sms 
 */
function decodeGSM0338( sms ) {
    let str = '';
    if( sms ){
        str = sms; 
        // var splitter = require('split-sms');
        // var info = splitter.split( sms );
        // console.log( 'Obj :', info );
        str = str.replace( /\u0000/gi, '' ).trim();
    }
    return str;
}


