﻿import { SealedClassError } from "../../Common/SealedClassError.js";
import { EventEmitter } from "../../Common/Threading/EventEmitter.js";
import { ReadyEvent } from "./ReadyEvent.js";
import { RestClient } from "../Rest/RestClient.js";
import { ThrowHelper } from "../../Common/ThrowHelper.js";
import { ClientWebSocket } from "../../Common/WebSockets/ClientWebSocket.js";
import { IDisposable } from "../../Common/IDisposable.js";
import { ObjectDisposedError } from "../../Common/ObjectDisposedError.js";
import { WebSocketMessageType } from "../../Common/WebSockets/WebSocketMessageType.js";
import { UInt8Stream } from "../../Common/IO/UInt8Stream.js";
import { WebSocketReceiveResult } from "../../Common/WebSockets/WebSocketReceiveResult.js";
import { GatewayPayload } from "./Models/GatewayPayload.js";
import { WebSocketCloseCode } from "../../Common/WebSockets/WebSocketCloseCode.js";
import { WebSocketState } from "../../Common/WebSockets/WebSocketState.js";
import { Channel } from "../../Common/Threading/Channels/Channel.js";
import { OperationType } from "./Models/OperationType.js";
import { ReadyEventData } from "./Models/ReadyEventData.js";
import { CommonClientWebSocket } from "./CommonClientWebSocket.js";
import { InvalidOperationError } from "../../Common/InvalidOperationError.js";
import { Intents } from "./Intents.js";
import { EventType } from "./Models/EventType.js";
import { PromiseCompletionSource } from "../../Common/Threading/PromiseCompletionSource.js";
import { WebSocketError } from "../../Common/WebSockets/WebSocketError.js";
import { UnboundedChannel } from "../../Common/Threading/Channels/UnboundedChannel.js";
import { Ban } from "../Rest/Entities/Ban.js";
import { BanData } from "../Rest/Entities/Models/BanData.js";
import { MessageData } from "../Rest/Entities/Models/MessageData.js";
import { Message } from "../Rest/Entities/Message.js";
import { UserStartedTypingEvent } from "./UserStartedTypingEvent.js";
import { UserStoppedTypingEvent } from "./UserStoppedTypingEvent.js";
import { RoomConnectionCreatedEvent } from "./RoomConnectionCreatedEvent.js";
import { RoomConnectionRemovedEvent } from "./RoomConnectionRemovedEvent.js";
import { UserCurrentRoomUpdatedEvent } from "./UserCurrentRoomUpdatedEvent.js";
import { UserTypingEventData } from "./Models/UserTypingEventData.js";
import { BanCreatedEvent } from "./BanCreatedEvent.js";
import { BanRemovedEvent } from "./BanRemovedEvent.js";
import { MessageCreatedEvent } from "./MessageCreatedEvent.js";
import { MessageRemovedEvent } from "./MessageRemovedEvent.js";
import { RoomCreatedEvent } from "./RoomCreatedEvent.js";
import { RoomUpdatedEvent } from "./RoomUpdatedEvent.js";
import { RoomRemovedEvent } from "./RoomRemovedEvent.js";
import { UserUpdatedEvent } from "./UserUpdatedEvent.js";
import { RoomConnectionEventData } from "./Models/RoomConnectionEventData.js";
import { RoomData } from "../Rest/Entities/Models/RoomData.js";
import { Room } from "../Rest/Entities/Room.js";
import { UserCurrentRoomUpdatedEventData } from "./Models/UserCurrentRoomUpdatedEventData.js";
import { UserData } from "../Rest/Entities/Models/UserData.js";
import { User } from "../Rest/Entities/User.js";
import { PresenceOption } from "./PresenceOption.js";
import { Func } from "../../Common/Func.js";
import { BigIntJsonReplacer } from "../../Common/Json/BigIntJsonReplacer.js";

export class GatewayClient implements IDisposable
{
	static readonly #s_textDecoder: TextDecoder = new TextDecoder("utf8", { fatal: true });
	static readonly #s_textEncoder: TextEncoder = new TextEncoder();
	readonly #_restClient: RestClient;
	readonly #_webSocket: ClientWebSocket;
	readonly #_eventEmitter: EventEmitter<ReceivableEvents> = new EventEmitter();
	#_pendingPayloads: Channel<PayloadSendRequest> | null = null;
	#_disconnectPromiseSource: PromiseCompletionSource<void> | null = null;
	#_address: URL | null = null;
	#_disposed: boolean = false;

	public constructor(options: {
		restClient?: RestClient,
		webSocketType?: new () => ClientWebSocket,
	} = {})
	{
		SealedClassError.throwIfNotEqual(GatewayClient, new.target);
		ThrowHelper.TypeError.throwIfNullable(options);
		ThrowHelper.TypeError.throwIfNotAnyType(options.restClient, RestClient, "undefined");
		ThrowHelper.TypeError.throwIfNotAnyType(options.webSocketType, "function", "undefined");

		this.#_restClient = options.restClient ?? new RestClient();
		this.#_webSocket = new (options.webSocketType ?? CommonClientWebSocket)();
	}

	public get rest()
	{
		ObjectDisposedError.throwIf(this.#_disposed);
		return this.#_restClient;
	}

	get #pendingPayloads()
	{
		if (this.#_pendingPayloads === null)
		{
			throw new InvalidOperationError("Pending payloads collection is null");
		}

		return this.#_pendingPayloads;
	}

	public setIntents(intents: Intents | 0)
	{
		ThrowHelper.TypeError.throwIfNotType(intents, "number");
		ObjectDisposedError.throwIf(this.#_disposed);

		if (this.#_webSocket.state !== WebSocketState.Closed)
		{
			throw new InvalidOperationError("Cannot set the gateway intents because the client is not disconnected");
		}

		this.#_webSocket.headers.delete("X-Intents");
		this.#_webSocket.headers.append("X-Intents", intents.toString());
		return this;
	}

	public setBaseAddress(uri: URL)
	{
		ThrowHelper.TypeError.throwIfNotType(uri, URL);
		ObjectDisposedError.throwIf(this.#_disposed);

		if (this.#_webSocket.state !== WebSocketState.Closed)
		{
			throw new InvalidOperationError("Cannot set the base uri when the client is connected");
		}

		this.#_address = new URL(`${uri.href}${uri.href.endsWith("/") ? "" : "/"}api/v1/gateway`);
		this.#_restClient.setBaseAddress(uri);

		return this;
	}

	public setToken(token: string)
	{
		ThrowHelper.TypeError.throwIfNotType(token, "string");
		ObjectDisposedError.throwIf(this.#_disposed);

		if (this.#_webSocket.state !== WebSocketState.Closed)
		{
			throw new InvalidOperationError("Cannot set the authorization token because the client is not disconnected");
		}

		this.#_webSocket.headers.delete("Authorization");
		this.#_webSocket.headers.append("Authorization", `Bearer ${token}`);
		this.#_restClient.setToken(token);
		return this;
	}

	public setDefaultPresence(presence: PresenceOption)
	{
		ThrowHelper.TypeError.throwIfNotType(presence, PresenceOption);
		ObjectDisposedError.throwIf(this.#_disposed);

		if (this.#_webSocket.state !== WebSocketState.Closed)
		{
			throw new InvalidOperationError("Cannot set the default presence because the client is not disconnected");
		}

		this.#_webSocket.headers.delete("X-Presence");
		this.#_webSocket.headers.append("X-Presence", presence.toString());
		return this;
	}

	public async connect(sessionId?: string)
	{
		ThrowHelper.TypeError.throwIfNotAnyType(sessionId, "string", "undefined");
		ObjectDisposedError.throwIf(this.#_disposed);

		if (this.#_webSocket.state !== WebSocketState.Closed ||
		    this.#_disconnectPromiseSource !== null)
		{
			throw new InvalidOperationError("Client is connecting or already connected");
		}

		if (this.#_address === null)
		{
			throw new InvalidOperationError("Client's base uri is not defined");
		}

		if (!this.#_webSocket.headers.has("X-Intents"))
		{
			throw new InvalidOperationError("Gateway intents are not defined");
		}

		this.#_webSocket.headers.delete("X-SessionId");
		if (sessionId !== undefined)
		{
			this.#_webSocket.headers.append("X-SessionId", sessionId);
		}

		await this.#_webSocket.connect(this.#_address);

		if (sessionId !== undefined)
		{
			await this.#_eventEmitter.emit("Resumed");
		}

		this.#_disconnectPromiseSource = new PromiseCompletionSource<void>();

		const receiveTask = this.#runPayloadReceiving();
		const sendTask = this.#runPayloadSending();

		Promise.all([ receiveTask, sendTask ]).then(() =>
		{
			this.#_disconnectPromiseSource!.resolve();
			this.#_disconnectPromiseSource = null;
			this.#_eventEmitter.emit("Disconnected");
		});
	}

	public async waitForDisconnect()
	{
		ObjectDisposedError.throwIf(this.#_disposed);
		if (this.#_disconnectPromiseSource === null)
		{
			throw new InvalidOperationError("Client is not connected");
		}

		await this.#_disconnectPromiseSource.promise;
	}

	async disconnect()
	{
		ObjectDisposedError.throwIf(this.#_disposed);
		if (this.#_webSocket.state !== WebSocketState.Open)
		{
			throw new InvalidOperationError("Client is not connected");
		}

		await this.#_webSocket.close(WebSocketCloseCode.NormalClosure);
	}

	public dispose()
	{
		if (this.#_disposed)
		{
			return;
		}

		this.#_eventEmitter.dispose();
		this.#_webSocket.dispose();

		this.#_disposed = true;
	}

	public on<TEvent extends keyof ReceivableEvents>(
		event: TEvent,
		listener: ReceivableEvents[TEvent])
	{
		ThrowHelper.TypeError.throwIfNullable(event);
		ThrowHelper.TypeError.throwIfNotType(listener, "function");
		ObjectDisposedError.throwIf(this.#_disposed);

		return this.#_eventEmitter.on(event, listener);
	}

	public remove<TEvent extends keyof ReceivableEvents>(
		event: TEvent,
		listener: ReceivableEvents[TEvent])
	{
		ThrowHelper.TypeError.throwIfNullable(event);
		ThrowHelper.TypeError.throwIfNotType(listener, "function");
		ObjectDisposedError.throwIf(this.#_disposed);

		return this.#_eventEmitter.remove(event, listener);
	}

	public async updatePresence(presence: PresenceOption)
	{
		ThrowHelper.TypeError.throwIfNotType(presence, PresenceOption);
		ObjectDisposedError.throwIf(this.#_disposed);
		this.#throwIfWebSocketNotOpen();

		const payload =
			{
				operation: OperationType.Dispatch,
				event: EventType[EventType.UpdatePresence],
				data: { presence },
			};
		const sendPromiseSource = new PromiseCompletionSource<void>();
		const sendRequest = new PayloadSendRequest(
			GatewayClient.#s_textEncoder.encode(JSON.stringify(payload, BigIntJsonReplacer)),
			sendPromiseSource);

		await this.#pendingPayloads.writer.waitToWrite();
		await this.#pendingPayloads.writer.write(sendRequest);
		await sendPromiseSource.promise;
	}

	async #emitEventFromPayload(payload: GatewayPayload)
	{
		ThrowHelper.TypeError.throwIfNotType(payload, GatewayPayload);

		switch (payload.operation)
		{
			case OperationType.Dispatch:
			{
				switch (payload.event)
				{
					case EventType[EventType.Ready]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, ReadyEventData);
						await this.#_eventEmitter.emit(
							"Ready", new ReadyEvent(payload.data, this));
						break;
					case EventType[EventType.BanCreated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, BanData);
						await this.#_eventEmitter.emit(
							"BanCreated", new BanCreatedEvent(new Ban(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.BanRemoved]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, BanData);
						await this.#_eventEmitter.emit(
							"BanRemoved", new BanRemovedEvent(new Ban(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.MessageCreated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, MessageData);
						await this.#_eventEmitter.emit(
							"MessageCreated", new MessageCreatedEvent(Message.create(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.MessageRemoved]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, MessageData);
						await this.#_eventEmitter.emit(
							"MessageRemoved", new MessageRemovedEvent(Message.create(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.UserStartedTyping]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, UserTypingEventData);
						await this.#_eventEmitter.emit(
							"UserStartedTyping", new UserStartedTypingEvent(payload.data, this));
						break;
					case EventType[EventType.UserStoppedTyping]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, UserTypingEventData);
						await this.#_eventEmitter.emit(
							"UserStoppedTyping", new UserStoppedTypingEvent(payload.data, this));
						break;
					case EventType[EventType.RoomConnectionCreated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, RoomConnectionEventData);
						await this.#_eventEmitter.emit(
							"RoomConnectionCreated", new RoomConnectionCreatedEvent(payload.data, this));
						break;
					case EventType[EventType.RoomConnectionRemoved]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, RoomConnectionEventData);
						await this.#_eventEmitter.emit(
							"RoomConnectionRemoved", new RoomConnectionRemovedEvent(payload.data, this));
						break;
					case EventType[EventType.RoomCreated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, RoomData);
						await this.#_eventEmitter.emit(
							"RoomCreated", new RoomCreatedEvent(new Room(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.RoomUpdated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, RoomData);
						await this.#_eventEmitter.emit(
							"RoomUpdated", new RoomUpdatedEvent(new Room(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.RoomRemoved]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, RoomData);
						await this.#_eventEmitter.emit(
							"RoomRemoved", new RoomRemovedEvent(new Room(payload.data, this.#_restClient), this));
						break;
					case EventType[EventType.UserCurrentRoomUpdated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, UserCurrentRoomUpdatedEventData);
						await this.#_eventEmitter.emit(
							"UserCurrentRoomUpdated", new UserCurrentRoomUpdatedEvent(payload.data, this));
						break;
					case EventType[EventType.UserUpdated]:
						ThrowHelper.TypeError.throwIfNotType(payload.data, UserData);
						await this.#_eventEmitter.emit(
							"UserUpdated", new UserUpdatedEvent(new User(payload.data, this.#_restClient), this));
						break;
					default:
						break;
				}

				break;
			}
			default:
				break;
		}
	}

	async #runPayloadReceiving()
	{
		this.#throwIfWebSocketNotOpen();

		while (this.#_webSocket.state === WebSocketState.Open)
		{
			const message = await this.#receiveMessage();
			if (message.type === WebSocketMessageType.Close ||
			    message.type === WebSocketMessageType.Binary)
			{
				const closeCode =
					message.type === WebSocketMessageType.Binary
						? WebSocketCloseCode.UnsupportedData
						: WebSocketCloseCode.NormalClosure;

				this.#pendingPayloads.writer.complete();
				await this.#_webSocket.close(closeCode);
				break;
			}

			try
			{
				const messageText = GatewayClient.#s_textDecoder.decode(message.content);
				this.#emitEventFromPayload(new GatewayPayload(JSON.parse(messageText))).then();
			}
			catch (error)
			{
				this.#pendingPayloads.writer.complete();

				if (!(error instanceof TypeError || error instanceof SyntaxError))
				{
					await this.#_webSocket.close(WebSocketCloseCode.InternalError);
					throw error;
				}

				await this.#_webSocket.close(WebSocketCloseCode.InvalidPayloadData);
			}

		}
	}

	async #receiveMessage()
	{
		this.#throwIfWebSocketNotOpen();

		const buffer = new Uint8Array(new ArrayBuffer(1024));
		const messageBytes = new UInt8Stream(1024);
		const messageWriter = messageBytes.getWriter();

		let received: WebSocketReceiveResult;
		do
		{
			try
			{
				received = await this.#_webSocket.receive(buffer);
			}
			catch (error)
			{
				if (!(error instanceof WebSocketError))
				{
					throw error;
				}

				return new GatewayReceivedMessage(new Uint8Array(), WebSocketMessageType.Close);
			}

			await messageWriter.write(new Uint8Array(buffer.buffer, 0, received.count));
		} while (!received.endOfMessage);

		await messageWriter.close();
		return new GatewayReceivedMessage(messageBytes.written, received.messageType);
	}

	async #runPayloadSending()
	{
		this.#throwIfWebSocketNotOpen();

		this.#_pendingPayloads = new UnboundedChannel();

		while (this.#_webSocket.state === WebSocketState.Open)
		{
			await this.#sendNextPayload();
		}
	}

	async #sendNextPayload()
	{
		if (!await this.#pendingPayloads.reader.waitToRead() ||
		    this.#_webSocket.state !== WebSocketState.Open)
		{
			return;
		}

		const payloadRequest = await this.#pendingPayloads.reader.read();
		await this.#_webSocket.send(payloadRequest.payloadBytes, WebSocketMessageType.Text, true);
		payloadRequest.requestPromiseSource.resolve();
	}

	#throwIfWebSocketNotOpen()
	{
		if (this.#_webSocket.state !== WebSocketState.Open)
		{
			throw new InvalidOperationError("WebSocket must be open");
		}
	}
}

class PayloadSendRequest
{
	readonly #_payloadBytes: Uint8Array;
	readonly #_requestPromiseSource: PromiseCompletionSource<void>;

	public constructor(payloadBytes: Uint8Array, requestPromiseSource: PromiseCompletionSource<void>)
	{
		SealedClassError.throwIfNotEqual(PayloadSendRequest, new.target);
		ThrowHelper.TypeError.throwIfNotType(payloadBytes, Uint8Array);
		ThrowHelper.TypeError.throwIfNotType(requestPromiseSource, PromiseCompletionSource);

		this.#_payloadBytes = payloadBytes;
		this.#_requestPromiseSource = requestPromiseSource;
	}

	public get payloadBytes()
	{
		return this.#_payloadBytes;
	}

	public get requestPromiseSource()
	{
		return this.#_requestPromiseSource;
	}
}

class GatewayReceivedMessage
{
	readonly #_content: Uint8Array;
	readonly #_type: WebSocketMessageType;

	public constructor(content: Uint8Array, type: WebSocketMessageType)
	{
		SealedClassError.throwIfNotEqual(GatewayReceivedMessage, new.target);
		ThrowHelper.TypeError.throwIfNotType(content, Uint8Array);
		ThrowHelper.TypeError.throwIfNotType(type, WebSocketMessageType);

		this.#_content = content;
		this.#_type = type;
	}

	public get content()
	{
		return this.#_content;
	}

	public get type()
	{
		return this.#_type;
	}
}

export interface ReceivableEvents
{
	Ready: Func<[ ReadyEvent ]>;
	Disconnected: Func;
	Resumed: Func;
	BanCreated: Func<[ BanCreatedEvent ]>;
	BanRemoved: Func<[ BanRemovedEvent ]>;
	MessageCreated: Func<[ MessageCreatedEvent ]>;
	MessageRemoved: Func<[ MessageRemovedEvent ]>;
	UserStartedTyping: Func<[ UserStartedTypingEvent ]>;
	UserStoppedTyping: Func<[ UserStoppedTypingEvent ]>;
	RoomConnectionCreated: Func<[ RoomConnectionCreatedEvent ]>;
	RoomConnectionRemoved: Func<[ RoomConnectionRemovedEvent ]>;
	RoomCreated: Func<[ RoomCreatedEvent ]>;
	RoomUpdated: Func<[ RoomUpdatedEvent ]>;
	RoomRemoved: Func<[ RoomRemovedEvent ]>;
	UserUpdated: Func<[ UserUpdatedEvent ]>;
	UserCurrentRoomUpdated: Func<[ UserCurrentRoomUpdatedEvent ]>;
}
