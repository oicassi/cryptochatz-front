import { Message } from './../models/message';
import { SocketService } from './services/socket.service';
import { Component, ModuleWithComponentFactories, OnInit, ViewChild, AfterViewChecked, ElementRef } from '@angular/core';
import * as moment from 'moment'
import { User } from 'src/models/user';
import * as CryptoJS from 'crypto-js';
import { Crypt, RSA } from 'hybrid-crypto-js';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewChecked {
  publicKey: any;
  privateKey: any;
  isConnected: boolean;
  isChatting: boolean;
  symKeyValid: boolean;
  symKey: string;
  name: string;
  id: number;
  socketId: string;
  msgBody: string;
  allMessages: Message[] = [];
  user: User = new User();
  rsa = new RSA();
  crypt = new Crypt();
  showInfoDialog;
  @ViewChild('chatContainer') private chatContainer: ElementRef;

  constructor(
    private _socketServ: SocketService,
    private _messageServ: MessageService) {

    // Inicialização das chaves públicas e privadas
    this.rsa.generateKeyPairAsync().then(keyPair => {
      this.publicKey = keyPair.publicKey;
      this.privateKey = keyPair.privateKey;

    });

    this.name = '';
    this.id = 0;
    this.msgBody = '';
    this.socketId = '';
    this.isConnected = false;
    this.isChatting = false;
    this.symKeyValid = false;
  }

  ngOnInit() {
    // Procedimento do subscribe da informação da conexão  
    this._socketServ.receiveConnectAck()
      .subscribe((info: any) => {
        this.id = info.id;
        this.socketId = info.socketId;
        this.isConnected = true;
        this._messageServ.add({ severity: 'success', summary: 'Conectado', detail: 'Você está conectado ao servidor' });
      });

    // Procedimento do subscribe da solicitação da chave simétrica
    this._socketServ.receiveRequestSymKey()
      .subscribe((requesterSymKey: any) => {
        let encryptSymKey = this.crypt.encrypt(requesterSymKey.publicKey, this.symKey);
        this._messageServ.add({ severity: 'warn', summary: 'Solicitação de chave simétrica', detail: `${requesterSymKey.name} [ID: ${requesterSymKey.id}] solicitou a chave simétrica]` });
        let symKeyInfo = {
          socketId: requesterSymKey.socketId,
          symKey: encryptSymKey,
        };
        console.log(`Chave pública de ${requesterSymKey.name} [${requesterSymKey.id}]`);
        console.log(requesterSymKey.publicKey);
        console.log('--------------------------');
        console.log(`Chave simétrica: ${this.symKey}`)
        console.log(`Cifra da chave simétrica: ${encryptSymKey.cipher}`);
        this._socketServ.sendSymKey(symKeyInfo);
      })
    // Procedimento do subscribe do recebimento de chave simétrica
    this._socketServ.receiveSymKey()
      .subscribe((symKey: any) => {
        let decryptSymKey = this.crypt.decrypt(this.privateKey, symKey);
        console.log(`Cifra recebida: ${JSON.parse(symKey).cipher}`)
        console.log(`Chave privada para descriptografar: ${this.privateKey}`);
        console.log(`Chave descriptografada: ${decryptSymKey.message}`);
        this.symKey = decryptSymKey.message;
        this.symKeyValid = true;
        this._messageServ.add({ severity: 'info', summary: 'Info', detail: 'Já existe um chat iniciado' });
      })

    // Procedimento do subscribe do recebimento de confirmação do início do chat
    this._socketServ.receiveChatAck()
      .subscribe((chatInfo: any) => {
        if (chatInfo.chatStatus) {
          this.isChatting = true;
        }
        if (chatInfo.id != this.id) {
          this._messageServ.add({ severity: 'info', summary: 'Info', detail: `Hoster do chat ${chatInfo.name} [ID: ${chatInfo.id}]` });
        } else {
          this._messageServ.add({ severity: 'success', summary: 'Em chat', detail: 'Você iniciou o chat' });
        }
      })

    // Procedimento info de início de chat por alguém
    this._socketServ.receiveChatStarter()
      .subscribe(async (chatStarter: any) => {
        if (chatStarter.id != this.id) {
          let ms = `Chat iniciado por ${chatStarter.name} [ID: ${chatStarter.id}]`;
          let reqMsg = 'Requisitando a chave simétrica';
          this._messageServ.add({severity: 'warn', summary: 'Aviso', detail: ms});
          this._messageServ.add({severity: 'info', summary: 'Info', detail: reqMsg});
          let requestSymKeyInfo = {
            socketId: this.socketId,
            publicKey: this.publicKey,
            name: this.name,
            id: this.id
        }
          await this._socketServ.requestSymKey(requestSymKeyInfo);
        }
      })

    // Procedimento do subscribe do recebimento de mensagem
    this._socketServ.receiveMsg()
      .subscribe((msg: Message) => {
        if (this.isChatting) {
          msg.body = CryptoJS.AES.decrypt(msg.bodyEncrypted.trim(), this.symKey.trim()).toString(CryptoJS.enc.Utf8);
          console.log('---------- MENSAGEM RECEBIDA E DESCRIPTOGRAFADA -----------');
          console.log(msg);
          this.allMessages.push(msg);
        }
      });

    // Procedimento do subscribe de novo usuário conectado
    this._socketServ.receiveNewUser()
      .subscribe((userConn) => {
        if (this.isChatting) {
          if (userConn.id != this.id) {
            let info = `${userConn.name} [ID: ${userConn.id}] entrou no chat`
            this._messageServ.add({ severity: 'info', summary: 'Novo usuário conectado', detail: info });
          }
        }
      })

    // Procedimento do subscribe de usuário desconectado
    this._socketServ.receiveUserLost()
      .subscribe((userDisc) => {
        if (this.isChatting) {
          let ms = new Message();
          ms.data = (moment().format('DD/MM/YYYY - HH:mm'));
          ms.timeStamp = 0;
          ms.from = '[sistema]'
          ms.id = -999;
          ms.bodyEncrypted = '';
          ms.body = `${userDisc.name} [ID: ${userDisc.id}] saiu do chat - ${ms.data}`;
          this._messageServ.add({ severity: 'warn', summary: 'Info', detail: `${userDisc.name} [ID: ${userDisc.id}] saiu` });
          this.allMessages.push(ms);
        }
      })

    // Procedimento do subscribe de novo host
    this._socketServ.receiveNewHost()
      .subscribe((chatHoster: any) => {
        if (this.isChatting) {
          let msg = (chatHoster.id == this.id ? 'Você é o novo Hoster do chat' : `${chatHoster.name} [ID: ${chatHoster.id}] é o novo Hoster do chat`);
          this._messageServ.add({ severity: 'info', summary: 'Mudança de Hoster', detail: msg });
        }
      })
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  connect() {
    this.user.id = this.id;
    this.user.name = this.name;
    this.user.publicKey = this.publicKey;
    this.user.socketId = this.socketId;
    console.log('Connectando e enviando a info:');
    console.log('ID: ' + this.user.id);
    console.log('UserName: ' + this.user.name);
    console.log('Public Key: ' + this.user.publicKey);
    console.log('SocketID: ' + this.user.socketId);
    this._socketServ.connect(this.user);
  }

  startChat() {
    let userChatInfo = {
      id: this.id,
      name: this.name,
      socketId: this.socketId,
    }
    this._socketServ.startChat(userChatInfo);
  }

  send() {
    let msg: Message = new Message();
    msg.from = this.name;
    msg.id = this.id;
    msg.data = (moment().format('DD/MM/YYYY - HH:mm'));
    msg.timeStamp = moment().valueOf();
    // Criptografar o body da mensagem com a chave simétrica
    msg.bodyEncrypted = CryptoJS.AES.encrypt(this.msgBody.trim(), this.symKey.trim()).toString();
    msg.body = '';
    console.log('--------- MENSAGEM ENVIADA ----------');
    console.log(msg);
    this._socketServ.sendMsg(msg);
    this.msgBody = '';
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.log(err);
    }
  }
}
