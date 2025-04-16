﻿import { SealedClassError } from "./SealedClassError.js";
import { ThrowHelper } from "./ThrowHelper.js";

/**
 * The exception that is thrown when an invoked method is not supported.
 * @sealed
 * */
export class NotSupportedError extends Error
{
	/**
	 * Initializes a new instance of {@link NotSupportedError}.
	 * @param message The error message.
	 * */
	public constructor(message: string = "The operation is not supported")
	{
		super(message);
		SealedClassError.throwIfNotEqual(NotSupportedError, new.target);
		ThrowHelper.TypeError.throwIfNotType(message, "string");
	}
}
