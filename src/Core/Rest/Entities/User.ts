﻿import { ThrowHelper } from "../../../Common/ThrowHelper.js";
import { RestClient } from "../RestClient.js";
import { UserData } from "./Models/UserData.js";
import { Permissions } from "./Permissions.js";
import { SealedClassError } from "../../../Common/SealedClassError.js";
import { Room } from "./Room.js";
import { TypeHelper } from "../../../Common/TypeHelper.js";
import { UnreachableError } from "../../../Common/UnreachableError.js";

export class User
{
	readonly #_restClient: RestClient;
	readonly #_data: UserData;
	#_permissions: Permissions | null = null;

	public constructor(data: UserData, restClient: RestClient)
	{
		SealedClassError.throwIfNotEqual(User, new.target);
		ThrowHelper.TypeError.throwIfNotType(data, UserData);
		ThrowHelper.TypeError.throwIfNotType(restClient, RestClient);

		this.#_restClient = restClient;
		this.#_data = data;
	}

	public get restClient()
	{
		return this.#_restClient;
	}

	public get id()
	{
		return this.#_data.id;
	}

	public get displayName()
	{
		return this.#_data.displayName;
	}

	public get description()
	{
		return this.#_data.description;
	}

	public get type()
	{
		return this.#_data.type;
	}

	public get presence()
	{
		return this.#_data.presence;
	}

	public get permissions()
	{
		return this.#_permissions ??= BigInt(this.#_data.permissions);
	}

	public get currentRoomId()
	{
		return this.#_data.currentRoomId;
	}

	public async getLatest()
	{
		const user = await this.restClient.getUser(this.id);
		if (user === null)
		{
			throw new UnreachableError("User expected to exist, but the server sent nothing.");
		}

		return user;
	}

	public async getCurrentRoom()
	{
		if (this.currentRoomId === null)
		{
			return null;
		}

		return await this.restClient.getRoom(this.currentRoomId);
	}


	public async setCurrentRoom(room: Room | string | null)
	{
		ThrowHelper.TypeError.throwIfNotAnyType(room, Room, "string", "null");

		const roomId = TypeHelper.isType(room, Room) ? room.id : room ?? undefined;
		return await this.restClient.setUserRoom(this.id, { roomId });
	}

	public async setPermissions(permissions: Permissions)
	{
		ThrowHelper.TypeError.throwIfNotType(permissions, "bigint");
		return await this.restClient.setUserPermissions(this.id, { permissions });
	}

	public async ban(reason?: string)
	{
		ThrowHelper.TypeError.throwIfNotAnyType(reason, "string", "undefined");
		return await this.restClient.banUser(this.id, { reason });
	}

	public async unban()
	{
		return await this.restClient.unbanUser(this.id);
	}
}
