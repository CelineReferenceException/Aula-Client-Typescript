﻿import {AulaError} from "../AulaError.js";
import {ThrowHelper} from "../../Common/ThrowHelper.js";
import {SealedClassError} from "../../Common/SealedClassError.js";

export class AulaNotFoundError extends AulaError
{
	public constructor(content: string | null)
	{
		super(`The resource doesn't exist.`, content);
		SealedClassError.throwIfNotEqual(AulaNotFoundError, new.target);
		ThrowHelper.TypeError.throwIfNotAnyType(content, "string", "null");
	}
}
