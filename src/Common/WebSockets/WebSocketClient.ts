﻿import { WebSocketState } from "./WebSocketState.js";
import { WebSocketReceiveResult } from "./WebSocketReceiveResult.js";
import { WebSocketMessageType } from "./WebSocketMessageType.js";
import { IDisposable } from "../IDisposable.js";
import { WebSocketError } from "./WebSocketError.js";
import { ThrowHelper } from "../ThrowHelper.js";
import { HeaderMap } from "../Http/HeaderMap.js";

export abstract class WebSocketClient implements IDisposable
{
	public Headers: HeaderMap = new HeaderMap();

	/**
	 * Returns the current state of the {@link WebSocketClient} connection.
	 * */
	public abstract state: WebSocketState;

	/**
	 * Returns a {@link boolean} that indicates if the state of the {@link WebSocketClient} instance
	 * is {@link WebSocketState.Closed} or {@link WebSocketState.Aborted}.
	 * */
	protected static isStateTerminal(state: WebSocketState): boolean
	{
		ThrowHelper.TypeError.throwIfNotType(state, WebSocketMessageType);
		return state === WebSocketState.Closed || state === WebSocketState.Aborted;
	}

	/**
	 * Verifies that the connection is in an expected state.
	 * */
	protected static throwOnInvalidState<TArray extends Array<WebSocketState>>(currentState: WebSocketState, validStates: TArray)
		: asserts this is { state: Exclude<WebSocketState, TArray[number]> }
	{
		ThrowHelper.TypeError.throwIfNotType(currentState, WebSocketState);
		ThrowHelper.TypeError.throwIfNotTypeArray(validStates, WebSocketState);

		if (validStates.includes(currentState))
		{
			return;
		}

		const validStatesText = validStates
			.map(s => WebSocketState[ s ])
			.join(", ");
		throw new WebSocketError(`WebSocket is on an invalid state. Expected ${validStatesText} but got ${WebSocketState[ currentState ]}`);
	}

	/**
	 * Receives data from the {@link WebSocketClient} connection asynchronously.
	 * */
	public abstract receive(buffer: ArrayBuffer): Promise<WebSocketReceiveResult>;

	/**
	 * Sends data over the {@link WebSocketClient} connection asynchronously.
	 * */
	public abstract send(buffer: ArrayBuffer, messageType: WebSocketMessageType, endOfMessage: boolean): Promise<void>;

	/**
	 * Closes the {@link WebSocketClient} connection as an asynchronous operation.
	 * */
	public abstract close(): Promise<void>;

	/**
	 * Aborts the {@link WebSocketClient} connection and cancels any pending IO operations.
	 * */
	public abstract abort(): void;

	/**
	 * @inheritDoc
	 * */
	public abstract dispose(): void;
}
