﻿import { ThrowHelper } from "../../Common/ThrowHelper.js";
import { SealedClassError } from "../../Common/SealedClassError.js";

export class ResetBotTokenResponse
{
	readonly #_token: string;

	public constructor(data: any)
	{
		SealedClassError.throwIfNotEqual(ResetBotTokenResponse, new.target);
		ThrowHelper.TypeError.throwIfNullable(data);
		ThrowHelper.TypeError.throwIfNotType(data.token, "string");

		this.#_token = data.token;
	}

	public get token()
	{
		return this.#_token;
	}
}
