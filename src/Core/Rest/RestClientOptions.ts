﻿import { HttpClient } from "../../Common/Http/HttpClient.js";
import { SealedClassError } from "../../Common/SealedClassError.js";
import { ThrowHelper } from "../../Common/ThrowHelper.js";

/**
 * Represents configuration options for a {@link RestClient}.
 * @sealed
 */
export class RestClientOptions
{
	static #_default: RestClientOptions | null = null;

	#_httpClient: HttpClient | null = null;
	#_disposeHttpClient: boolean = true;

	/**
	 * Initializes a new instance of {@link RestClientOptions}.
	 */
	public constructor()
	{
		SealedClassError.throwIfNotEqual(RestClientOptions, new.target);
	}

	/**
	 * Gets the default options.
	 */
	public static get default()
	{
		return this.#_default ??= new RestClientOptions();
	}

	/**
	 * Gets the {@link HttpClient} instance used for making HTTP requests.
	 * @default null
	 */
	public get httpClient()
	{
		return this.#_httpClient;
	}

	/**
	 * Sets the {@link HttpClient} instance used for making HTTP requests.
	 */
	public set httpClient(httpClient: HttpClient | null)
	{
		ThrowHelper.TypeError.throwIfNotAnyType(httpClient, HttpClient, "null");
		this.#_httpClient = httpClient;
	}

	/**
	 * Gets whether the HTTP client should be disposed when the {@link RestClient} is disposed.
	 * @default true
	 */
	public get disposeHttpClient()
	{
		return this.#_disposeHttpClient;
	}

	/**
	 * Sets whether the HTTP client should be disposed when the {@link RestClient} is disposed.
	 */
	public set disposeHttpClient(disposeHttpClient: boolean)
	{
		ThrowHelper.TypeError.throwIfNotType(disposeHttpClient, "boolean");
		this.#_disposeHttpClient = disposeHttpClient;
	}

	/**
	 * Sets the {@link HttpClient} instance used for making HTTP requests.
	 * @param httpClient The {@link HttpClient} instance to use,
	 *                   or `null` to let the RestClient instantiate and configure its own {@link HttpClient}.
	 * @returns The current {@link RestClientOptions} instance.
	 */
	public withHttpClient(httpClient: HttpClient | null)
	{
		this.httpClient = httpClient;
		return this;
	}

	/**
	 * Sets whether the HTTP client should be disposed when the {@link RestClient} is disposed.
	 * @param disposeHttpClient `true` to dispose the client; otherwise, `false`.
	 * @returns The current {@link RestClientOptions} instance.
	 */
	public withDisposeHttpClient(disposeHttpClient: boolean)
	{
		this.disposeHttpClient = disposeHttpClient;
		return this;
	}
}
