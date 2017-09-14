var start = function(modem){
    
    //--------
    modem.execute( 'AT+CSCS="GSM"');
    modem.execute( 'AT+CMGF=1');
    modem.execute( 'AT+CNMI=2,1,0,1,0');

    modem.smsReceived = function(cmti) {
        // console.log( 'Message CMTI :', cmti );
        
        var message_info = this.parseResponse(cmti);
        var memory = message_info[0];
        this.execute('AT+CPMS="'+memory+'"', function(memory_usage) {
            var memory_usage = modem.parseResponse(memory_usage);
            var used  = parseInt(memory_usage[0]);
            var total = parseInt(memory_usage[1]);

            if(used === total)
                modem.emit('memory full', memory);
        });

        this.execute('AT+CMGR='+message_info[1], function(cmgr) {
            // cmgr = cmgr + ',', cmti.split(',')[1]
            // console.log( 'Real CMGR :', cmgr );
            //----  J'ajoute manuellement l'index du message à la chaîne.
            let tabCMGR = this.parseCMGR( cmgr );    
            let sms = this.parseSMSFromCMGR(tabCMGR, 1, message_info[1]);
            
            this.emit('sms received', sms);
        }.bind(this));
    }

    /**
     * 
     */
    modem.deliveryReceived = function(delivery) {
        //-----------   #Archi
        var response = this.parseResponse(delivery);
        this.execute('AT+CPMS="'+response[0]+'"');
        this.execute('AT+CMGR='+response[1], function(cmgr) {
            let tabCMGR = this.parseCMGR( cmgr );
            
            let deliveryReport = {};
            deliveryReport.status = tabCMGR[0];   //-- Etat du message : 'REC READ', 'REC UNREAD', 'STO UNSENT', 'STO SENT'
            deliveryReport.sentMessageReference = tabCMGR[2];  //--- La référence en mémoire (AT+CPMS) du message du message dont l'accusé de reception est devant nous
            deliveryReport.speaker = tabCMGR[3];  //-- Le destinataire du message dont l'accusé de reception est devant nous
            // deliveryReport.arrival = tabCMGR[5];  //-- Arrival time to SC
            let date_time = this.parseDate( tabCMGR[6] );
            deliveryReport.sendingTime = date_time;  //--  
             
            // let deliveryReport = this.parseSMS( tabCMGR, 0 );
            // console.log( 'Date time :', tb );
            this.emit( 'delivery', deliveryReport );
        }.bind(this));
    }
    /**
     * Convertit le retour de la commande +CMGR (en mode texte) dans un format qu'on peut simplement spliter
     * avec ',' car les datetime incluent possèdent eux même des ',' internes
     * Puis renvoie le tableau splité à la fin.
     * A chaque lecture CMGR (stored sms, received SMS ou delivery report de traiter les indices du tableau)
     */
    modem.parseCMGR = function (cmgr) {
        let tab = cmgr.split('\n');
        let prov = tab ? tab[1] : null;  //---   Le texte du message (s'il yen a) commence par '\n'
        if( prov )
        {
            cmgr = tab[0];
        }
        
        cmgr = cmgr.replace( /\+CMGR:|"/g, '' ).trim();
        tab = cmgr.match( /,\d{1,2}:/g );

        tab.forEach(function(el) {
            cmgr = cmgr.replace( el, ' ' + el.substring(1, el.length) );
        });
        
        tab = cmgr.split( ',' );
        if( prov )
            tab.push(prov);
              
        return tab;
    };

    /**
     * Reçoit un tableau ayant pour origine le split d'une ligne d'sms (+CMGL) et le
     *  convertit en objet sms puis le renvoie 
     * @type : 0 : deliveryReport, 1 -> sms reçu simple
     */
    modem.parseSMS = function (tabSms, type) {
        let objSms = {};
        // console.log( 'One line :', tabSms ); 
        objSms.isDeliveryReport = ( type == 0 );
        objSms.index = tabSms[0];
        objSms.status = tabSms[1];   //-- Etat du message : 'REC READ', 'REC UNREAD', 'STO UNSENT', 'STO SENT'
        let time_ ;
        let texte;
        let speaker, sentMessageReference;  //---- Si c'est un acccusé de reception ceci contiendra la référence du message dont l'accusé st là

        if( objSms.status.match( /REC/gi ) ){

            if( objSms.isDeliveryReport ){
                time_ = this.parseDate( tabSms[7] );    //--- Le moment où on on a reçu l'accusé de réception
                speaker = tabSms[4]; 
                sentMessageReference = tabSms[3];
                objSms.sentMessageReference = sentMessageReference;
                objSms.sendingTime = this.parseDate( tabSms[6] );;  //Le message de l'accusé a été envoyé à cet instant.
    
            }else{
                speaker = tabSms[2];
                time_ = this.parseDate( tabSms[4] );
                texte = tabSms[5];
                objSms.text = texte;
            }   
        }
        //-------------
        objSms.time = time_;
        objSms.speaker = speaker;

        return objSms;
    };

    /**
     * 
     */
    modem.parseSMSFromCMGR = function (tabSms, type, index) {
        let objSms = {};
        // console.log( 'One SMS CMGR :', tabSms ); 

        objSms.isDeliveryReport = ( type == 0 );
        objSms.index = parseInt(index); //---   L'index du message est donné en paramètre
        objSms.status = tabSms[0];   //-- Etat du message : 'REC READ', 'REC UNREAD', 'STO UNSENT', 'STO SENT'
        let time_ ;
        let texte;
        let speaker, sentMessageReference;  //---- Si c'est un acccusé de reception ceci contiendra la référence du message dont l'accusé st là

        if( objSms.status.match( /REC/gi ) ){

            if( objSms.isDeliveryReport ){
                time_ = this.parseDate( tabSms[7] );    //--- Le moment où on on a reçu l'accusé de réception
                speaker = tabSms[4]; 
                sentMessageReference = tabSms[3];
                objSms.sentMessageReference = sentMessageReference;
                objSms.sendingTime = this.parseDate( tabSms[6] );;  //Le message de l'accusé a été envoyé à cet instant.
    
            }else{
                speaker = tabSms[1];
                time_ = this.parseDate( tabSms[3] );
                texte = tabSms[4];
                objSms.text = texte;
            }   
        }
        //-------------
        objSms.time = time_;
        objSms.speaker = speaker;

        return objSms;
    };

    /**
     * 
     */
    modem.parseDate = function (dateStr) {
        try {
            let tb = dateStr.split( ' ' );
            let tbDate = tb[0].split('/');
            let year = parseInt(tbDate[0]);
            year = ( year < 2000 ) ? 2000 + year : year;

            let date_ = year + '-' + tbDate[1] + '-' + tbDate[2];
            // console.log( 'Date :', date_, '++++++++', tbDate );
            let dateFinale = new Date( date_ );
            //---------
            tb = tb[1].split('+')[0].split(':');
            // let time_ = tb[0];
            dateFinale.setHours( parseInt(tb[0]) );
            dateFinale.setMinutes( parseInt(tb[1]) );
            dateFinale.setSeconds( parseInt(tb[2]) );

            return dateFinale;
        } catch (error) {

        }
        return null;
    }

    /**
     * @type : [Facultatif] Prend 2 valeurs ou aucune
     * -> 'sent', 'received', draft
     */
    modem.getMessages = function(callback, type) {

        this.execute('AT+CMGF=1'); 
        let str = '.+';
        if( type ){
            if( type.match( /received/gi ) ){
                str = 'REC';
            }else if( type.match(/sent/gi) ){
                str = 'STO SENT';
            }else if( type.match( /draft/gi ) ){
                str = 'STO UNSENT';
            }
        }

        this.execute('AT+CMGL="ALL"', function(data, escape_char) {
            var messages = [];
            //  console.log( 'Datas are :', data );
            data = data.replace( /\+CMGL:/gi,'' ).trim();
            var lines = data.split("\n"); //TODO: \n AND \r\n
            // console.log( 'Lines :', lines );
            let linesReal = [];
            let prov;
            let b = 0;
            let obj;

            for( let i = 0, len = lines.length; i < len; i++ ){
                prov = lines[i];
                if( prov ){
                    //------    On fait ce test car le caractère qui commence les textes des sms leur font sauter de ligne, du coup le split les amène eux aussi à devenir un ligne à part qui n'utilise pas la même syntaxe 'REC ou STO'.
                    if( ! prov.match( /REC|STO/gi ) ){
                        b = i - 1;
                        while( ! linesReal[b] ){
                            b -= 1;
                        }
                        linesReal[b].type = 1;  //----  C'est un vrai sms
                        linesReal[b].str = linesReal[b].str + ',' + prov;
                        continue;
                    }

                    obj = {};
                    obj.str = prov;
                    obj.type = 0;   //--- C'est un accusé de reception
                
                    //-------   Quel type de message veut on
                    if( str ){
                        if( prov.match( new RegExp(str, 'ig') ) ){
                            linesReal.push( obj );
                        }
                    }else{
                        linesReal.push( obj );
                    }

                }
            }

            let message, tab;
            linesReal.forEach(function(line) {   
                tab = this.parseCMGR( line.str );            
                
                if( tab && tab[1].match( /REC/gi ) ){
                    // line = tab[0].trim();  
                    message = this.parseSMS( tab, line.type );
                }
                // console.log( 'Mechaz :', message );
                messages.push( message );

            }.bind(this));

            if(callback)
                callback(messages);
        }.bind(this));
    }

    modem.sms = function(message, callback) {
        //---- On teste si le modem supporte l'envoi de sms
        let cutSmsIntoPieces = function(smsString) {
            //-- One sms can contain up to 140 chars. SO each part of 140 will be sent separately
            return smsString.match(/.{1,139}/g);
        };

        let sendSms = function (smsString) {
            modem.execute( 'AT+CSMP=34,,,7', function(code0, response0) {
                // console.log(arguments);
             
            });

            modem.execute( 'AT+CSCS="GSM"', function(code0, response0) {
                
                if( response0.match( /ok/i )  ){ 
                
                    modem.execute( 'AT+CMGF=1', function(code, response) {

                        // console.log( 'REP code ->', code, 'Response :', response );             
                        if( response.match( /ok/i )  ){ 
                            //-------- oN DEFINIT LES PARAMÈTREs du SMS (Ici,l on demande un accusé de reception avec le 5e bit) avec le premier parametre
                            //------ Mode debug d'erreurs
                            // modem.execute('AT+CMEE=1'); 
                    
                            // console.log( 'Commande :', 'AT+CMGS="' + message.receiver + '"', smsString )
                            modem.execute( 'AT+CMGS="' + message.receiver + '"', function(code1, response1) {
                                // console.log( 'Rep 1 code ', code1, 'Response :', response1 );             
                                if( response1.match( />/i )  ){ 
                                    //-------
                                    modem.execute( smsString + String.fromCharCode(26), function(code2, response2) {
                                    //    console.log( 'Rep 2 code ', code2, 'Response :', response2 );             
                                        let awe = false;    
                                        if( response2.match( /ok/i )  ){
                                            // console.log( 'Message sent, code ', code2, 'Response :', response2 );                                                         
                                            let resp = modem.parseResponse( code2 ); 
                                            ids.push(resp[0]);
                                        
                                        //------- One part is sent, let's test if there are still remaining parts to be sent
                                        ++i;
                                        if( smsTab[i] ){
                                            sendSms( smsTab[i] );
                                            return;
                                        }else{   //---- All sms are fianlly sent
                                                awe = 1;
                                        }
                
                                        }else{
                                            if( i > 0 ) //---- If some parts of sms were already sent
                                                awe = 2;
            
                                            // console.log( 'Message non envoyé, code ', code2, 'Response :', response2 );             
                                        }

                                        //-------- Si 
                                        if( awe ){
                                            switch( awe ){
                                                case 1: //------ Everything is good
                                                    callback(awe, null, ids); //We've pushed all PDU's and gathered their ID's. calling the callback.
                                                    modem.emit('sms sent', smsString, ids);
                                                break;
                                                //----------
                                                case 2: //---- Message partially sent
                                                    callback(awe, 'Message partially sent', ids); //We've pushed all PDU's and gathered their ID's. calling the callback.
                                                    modem.emit('sms sent', smsString, ids);
                                                break;
                                            }
                                        
                                        }else{  //--- Erreur materielle
                                            callback( 0, code2 + ' ' + response2 );
                                        }
                                    });
                                }else{  //-------- Error occured
                                    callback( 0, code1 + ' ' + response1 );
                                }

                            } );

                        }else{  //------- Error uccured
                            callback( 0, code + ' ' + response );
                        }

                    });
                } 
            });   
        };
        //----------------------
        let ids = [];   // Will contain sent sms references cause one one sms can be cut into several pieces
        let smsTab = cutSmsIntoPieces( message.text );
        var i = 0;

        sendSms( smsTab[i] );
    }
    
}
//--------------------------------------------------------------
module.exports.start = start;