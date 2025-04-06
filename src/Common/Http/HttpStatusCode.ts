﻿/**
 * Contains the values of status codes defined for HTTP defined in {@link https://www.rfc-editor.org/rfc/rfc2616 RFC 2616}.
 * @remarks May not all the defined status codes be enumerated in this enum.
 * */
export const HttpStatusCode =
{
	Continue: 100,
	SwitchingProtocols: 101,
	Ok: 200,
	Created: 201,
	Accepted: 202,
	NonAuthoritativeInformation: 203,
	NoContent: 204,
	ResetContent: 205,
	PartialContent: 206,
	MultipleChoices: 300,
	Ambiguous: 300,
	MovedPermanently: 301,
	Moved: 301,
	Found: 302,
	Redirect: 302,
	SeeOther: 303,
	RedirectMethod: 303,
	NotModified: 304,
	UseProxy: 305,
	Unused: 306,
	TemporaryRedirect: 307,
	RedirectKeepVerb: 307,
	BadRequest: 400,
	Unauthorized: 401,
	PaymentRequired: 402,
	Forbidden: 403,
	NotFound: 404,
	MethodNotAllowed: 405,
	NotAcceptable: 406,
	ProxyAuthenticationRequired: 407,
	RequestTimeout: 408,
	Conflict: 409,
	Gone: 410,
	LengthRequired: 411,
	PreconditionFailed: 412,
	RequestEntityTooLarge: 413,
	RequestUriTooLong: 414,
	UnsupportedMediaType: 415,
	RequestedRangeNotSatisfiable: 416,
	ExpectationFailed: 417,
	UpgradeRequired: 426,
	TooManyRequests: 429,
	InternalServerError: 500,
	NotImplemented: 501,
	BadGateway: 502,
	ServiceUnavailable: 503,
	GatewayTimeout: 504,
	HttpVersionNotSupported: 505,
} as const;

Object.freeze(HttpStatusCode);

export type HttpStatusCode = typeof HttpStatusCode[keyof typeof HttpStatusCode];
