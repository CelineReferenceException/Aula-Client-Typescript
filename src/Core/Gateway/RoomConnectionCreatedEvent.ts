﻿import { ThrowHelper } from "../../Common/ThrowHelper.js";
import { RoomConnectionEventData } from "./Models/RoomConnectionEventData.js";
import { SealedClassError } from "../../Common/SealedClassError.js";
import { GatewayClient } from "./GatewayClient.js";

/**
 * @sealed
 * */
export class RoomConnectionCreatedEvent
{
	readonly #_data: RoomConnectionEventData;
	readonly #_gatewayClient: GatewayClient;

	public constructor(data: RoomConnectionEventData, gatewayClient: GatewayClient)
	{
		SealedClassError.throwIfNotEqual(RoomConnectionCreatedEvent, new.target);
		ThrowHelper.TypeError.throwIfNotType(data, RoomConnectionEventData);
		ThrowHelper.TypeError.throwIfNotType(gatewayClient, GatewayClient);

		this.#_data = data;
		this.#_gatewayClient = gatewayClient;
	}

	public get sourceRoomId()
	{
		return this.#_data.sourceRoomId;
	}

	public get targetRoomId()
	{
		return this.#_data.targetRoomId;
	}

	public get gatewayClient()
	{
		return this.#_gatewayClient;
	}
}
