import { environment } from './../../environments/environment';
import { Message } from './../../models/message';
import { User } from './../../models/user';
import { Injectable } from '@angular/core';
import * as socketio from 'socket.io-client';
import { Subject, fromEventPattern } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  // URL na qual será feita a conexão
  private url = environment.apiUrl;
  // Criação do socket para conexão com a URL especificada
  private socket; //= socketio(this.url, {autoConnect: false});
  // Subject para inscrever recebimento de mensagem
  private subMsg: Subject<Message> = new Subject<Message>();
  // Subject para inscrever confirmação de conexão
  private subAck: Subject<any> = new Subject<any>();
  // Subject para inscrever confirmação de início de chat
  private subChatAck: Subject<any> = new Subject<any>();
  // Subject para inscrever info de início de chat por alguém
  private subChatStarter: Subject<any> = new Subject<any>();
  // Subject para inscrever solicitação de symkey
  private subRequestSymKey: Subject<any> = new Subject<any>();
  // Subject para inscrever recebimento de symKey
  private subSymKey: Subject<any> = new Subject<any>();
  // Subject para inscrever info de novo usuário
  private subNewUser: Subject<any> = new Subject<any>();
  // Subject para inscrever info de usuário desconectado
  private subUserLost: Subject<any> = new Subject<any>();
  // Subject para inscrever info de novo Hoster
  private subNewHost: Subject<any> = new Subject<any>();
  // Subject para inscrever alguém está digitando
  private subTyping: Subject<number> = new Subject<number>();

  constructor() {
  }

  connect(u: User) {
    this.socket = socketio(this.url);

    this.socket.on('connect', (us) => {
      this.socket.emit('connectionExtra', u);
    })

    this.socket.on('connectAck', (info: any) => {
      return this.subAck.next(info);
    });

    this.socket.on('requestSymKey', (requesterSocketId) => {
      return this.subRequestSymKey.next(requesterSocketId);
    })

    this.socket.on('symKey', (symKey) => {
      return this.subSymKey.next(symKey);
    })

    this.socket.on('startChatAck', (chatAckInfo: any) => {
      return this.subChatAck.next(chatAckInfo);
    })

    this.socket.on('notifyChatStarter', (chatStarter) => {
      return this.subChatStarter.next(chatStarter);
    })

    this.socket.on('message', (m: Message) => {
      return this.subMsg.next(m);
    });

    this.socket.on('newUser', (userConn: any) => {
      return this.subNewUser.next(userConn);
    })

    this.socket.on('userLost', (userDisc: any) => {
      return this.subUserLost.next(userDisc);
    })

    this.socket.on('newHost', (chatHoster: any) => {
      return this.subNewHost.next(chatHoster);
    })

    this.socket.on('someTyping', (id: number) => {
      return this.subTyping.next(id);
    })
  }

  sendSymKey(symKeyInfo: any) {
    this.socket.emit('symKeyInfo', symKeyInfo);
  }

  startChat(userChatInfo: any) {
    this.socket.emit('startChat', userChatInfo);
  }

  requestSymKey(symKeyReqInfo: any) {
    this.socket.emit('manualRequestSymKey', symKeyReqInfo);
  }

  /**
   * Função para enviar a mensagem para o servido
   * @param msg Objeto do tipo Message
   */
  sendMsg(msg: Message) {
    this.socket.emit('message', msg);
  }

  sendTyping(id: number) {
    this.socket.emit('typing', id)
  }

  receiveConnectAck() {
    return this.subAck.asObservable();
  }

  receiveRequestSymKey() {
    return this.subRequestSymKey.asObservable();
  }

  receiveSymKey() {
    return this.subSymKey.asObservable();
  }

  receiveChatAck() {
    return this.subChatAck.asObservable();
  }

  receiveChatStarter() {
    return this.subChatStarter.asObservable();
  }

  receiveNewUser() {
    return this.subNewUser.asObservable();
  }

  receiveUserLost() {
    return this.subUserLost.asObservable();
  }

  receiveNewHost() {
    return this.subNewHost.asObservable();
  }

  /**
   * Função para receber as mensagens enviadas pelo servidor
   */
  receiveMsg() {
    return this.subMsg.asObservable();
  }

  receiveTyping() {
    return this.subTyping.asObservable();
  }

}
