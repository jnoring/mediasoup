const { toBeType } = require('jest-tobetype');
const { UnsupportedError } = require('../lib/errors');
const ortc = require('../lib/ortc');

expect.extend({ toBeType });

test('generateRouterRtpCapabilities() succeeds', () =>
{
	const mediaCodecs =
	[
		{
			kind       : 'audio',
			name       : 'opus',
			mimeType   : 'audio/opus',
			clockRate  : 48000,
			channels   : 2,
			parameters :
			{
				useinbandfec : 1,
				foo          : 'bar'
			}
		},
		{
			kind      : 'video',
			name      : 'VP8',
			clockRate : 90000
		},
		{
			kind         : 'video',
			name         : 'H264',
			mimeType     : 'video/H264',
			clockRate    : 90000,
			rtcpFeedback : [], // Will be ignored.
			parameters   :
			{
				'level-asymmetry-allowed' : 1,
				'profile-level-id'        : '42e01f',
				foo                       : 'bar'
			}
		}
	];

	const rtpCapabilities = ortc.generateRouterRtpCapabilities(mediaCodecs);

	expect(rtpCapabilities.codecs.length).toBe(5);

	// opus.
	expect(rtpCapabilities.codecs[0]).toEqual(
		{
			kind                 : 'audio',
			name                 : 'opus',
			mimeType             : 'audio/opus',
			preferredPayloadType : 100, // 100 is the first PT chosen.
			clockRate            : 48000,
			channels             : 2,
			rtcpFeedback         : [],
			parameters           :
			{
				useinbandfec : 1,
				foo          : 'bar'
			}
		});

	// VP8.
	expect(rtpCapabilities.codecs[1]).toEqual(
		{
			kind                 : 'video',
			name                 : 'VP8',
			mimeType             : 'video/VP8',
			preferredPayloadType : 101,
			clockRate            : 90000,
			rtcpFeedback         :
			[
				{ type: 'nack' },
				{ type: 'nack', parameter: 'pli' },
				{ type: 'ccm', parameter: 'fir' },
				{ type: 'goog-remb' }
			],
			parameters : {}
		});

	// VP8 RTX.
	expect(rtpCapabilities.codecs[2]).toEqual(
		{
			kind                 : 'video',
			name                 : 'rtx',
			mimeType             : 'video/rtx',
			preferredPayloadType : 102,
			clockRate            : 90000,
			rtcpFeedback         : [],
			parameters           :
			{
				apt : 101
			}
		});

	// H264.
	expect(rtpCapabilities.codecs[3]).toEqual(
		{
			kind                 : 'video',
			name                 : 'H264',
			mimeType             : 'video/H264',
			preferredPayloadType : 103,
			clockRate            : 90000,
			rtcpFeedback         :
			[
				{ type: 'nack' },
				{ type: 'nack', parameter: 'pli' },
				{ type: 'ccm', parameter: 'fir' },
				{ type: 'goog-remb' }
			],
			parameters :
			{

				'packetization-mode'      : 0,
				'level-asymmetry-allowed' : 1,
				'profile-level-id'        : '42e01f',
				foo                       : 'bar'
			}
		});

	// H264 RTX.
	expect(rtpCapabilities.codecs[4]).toEqual(
		{
			kind                 : 'video',
			name                 : 'rtx',
			mimeType             : 'video/rtx',
			preferredPayloadType : 104,
			clockRate            : 90000,
			rtcpFeedback         : [],
			parameters           :
			{
				apt : 103
			}
		});
});

test('generateRouterRtpCapabilities() with unsupported codecs throws UnsupportedError', () =>
{
	let mediaCodecs;

	mediaCodecs =
	[
		{
			kind      : 'audio',
			name      : 'chicken',
			mimeType  : 'audio/chicken',
			clockRate : 8000,
			channels  : 4
		}
	];

	expect(() => ortc.generateRouterRtpCapabilities(mediaCodecs))
		.toThrow(UnsupportedError);

	mediaCodecs =
	[
		{
			kind      : 'audio',
			name      : 'opus',
			mimeType  : 'audio/opus',
			clockRate : 48000,
			channels  : 1
		}
	];

	expect(() => ortc.generateRouterRtpCapabilities(mediaCodecs))
		.toThrow(UnsupportedError);

	mediaCodecs =
	[
		{
			kind       : 'video',
			name       : 'H264',
			mimeType   : 'video/H264',
			clockRate  : 90000,
			parameters :
			{
				'packetization-mode' : 5
			}
		}
	];

	expect(() => ortc.generateRouterRtpCapabilities(mediaCodecs))
		.toThrow(UnsupportedError);
});

test('generateRouterRtpCapabilities() with too many codecs throws', () =>
{
	const mediaCodecs = [];

	for (let i = 0; i < 100; ++i)
	{
		mediaCodecs.push(
			{
				kind      : 'audio',
				name      : 'opus',
				mimeType  : 'audio/opus',
				clockRate : 48000,
				channels  : 2
			});
	}

	expect(() => ortc.generateRouterRtpCapabilities(mediaCodecs))
		.toThrow('cannot allocate');
});

test('assertCapabilities() succeeds', () =>
{
	const mediaCodecs =
	[
		{
			kind      : 'audio',
			name      : 'opus',
			mimeType  : 'audio/opus',
			clockRate : 48000,
			channels  : 2
		},
		{
			kind      : 'video',
			name      : 'VP8',
			mimeType  : 'video/VP8',
			clockRate : 90000
		},
		{
			kind       : 'video',
			name       : 'H264',
			mimeType   : 'video/H264',
			clockRate  : 90000,
			parameters :
			{
				'packetization-mode' : 1
			}
		}
	];

	const routerRtpCapabilities = ortc.generateRouterRtpCapabilities(mediaCodecs);

	const deviceRtpCapabilities =
	{
		codecs :
		[
			{
				kind                 : 'audio',
				name                 : 'opus',
				mimeType             : 'audio/opus',
				preferredPayloadType : 100,
				clockRate            : 48000,
				channels             : 2
			},
			{
				kind                 : 'video',
				name                 : 'H264',
				mimeType             : 'video/H264',
				preferredPayloadType : 103,
				clockRate            : 90000,
				parameters           :
				{
					foo                  : 1234,
					'packetization-mode' : 1
				}
			}
		]
	};

	expect(ortc.assertCapabilities(deviceRtpCapabilities, routerRtpCapabilities))
		.toBe(undefined);
});

test('assertCapabilities() with incompatible codecs throws UnsupportedError', () =>
{
	const mediaCodecs =
	[
		{
			kind      : 'audio',
			name      : 'opus',
			mimeType  : 'audio/opus',
			clockRate : 48000,
			channels  : 2
		},
		{
			kind      : 'video',
			name      : 'VP8',
			mimeType  : 'video/VP8',
			clockRate : 90000
		},
		{
			kind       : 'video',
			name       : 'H264',
			mimeType   : 'video/H264',
			clockRate  : 90000,
			parameters :
			{
				'packetization-mode' : 1
			}
		}
	];

	const routerRtpCapabilities = ortc.generateRouterRtpCapabilities(mediaCodecs);
	let deviceRtpCapabilities;

	deviceRtpCapabilities =
	{
		codecs :
		[
			{
				kind                 : 'audio',
				name                 : 'PCMU',
				mimeType             : 'audio/PCMU',
				preferredPayloadType : 0,
				clockRate            : 8000,
				channels             : 1
			}
		]
	};

	expect(() => ortc.assertCapabilities(deviceRtpCapabilities, routerRtpCapabilities))
		.toThrow(UnsupportedError);

	deviceRtpCapabilities =
	{
		codecs :
		[
			{
				kind                 : 'video',
				name                 : 'H264',
				mimeType             : 'video/H264',
				clockRate            : 90000,
				preferredPayloadType : 103,
				parameters           :
				{
					'packetization-mode' : 0
				}
			}
		]
	};

	expect(() => ortc.assertCapabilities(deviceRtpCapabilities, routerRtpCapabilities))
		.toThrow(UnsupportedError);
});

test('getProducerRtpParametersMapping(), getConsumableRtpParameters() and getConsumerRtpParameters() succeed', () =>
{
	const mediaCodecs =
	[
		{
			kind      : 'audio',
			name      : 'opus',
			mimeType  : 'audio/opus',
			clockRate : 48000,
			channels  : 2
		},
		{
			kind       : 'video',
			name       : 'H264',
			mimeType   : 'video/H264',
			clockRate  : 90000,
			parameters :
			{
				'level-asymmetry-allowed' : 1,
				'packetization-mode'      : 1,
				'profile-level-id'        : '4d0032',
				bar                       : 'lalala'
			}
		}
	];

	const routerRtpCapabilities = ortc.generateRouterRtpCapabilities(mediaCodecs);

	const rtpParameters =
	{
		codecs :
		[
			{
				name         : 'H264',
				mimeType     : 'video/H264',
				payloadType  : 111,
				clockRate    : 90000,
				rtcpFeedback :
				[
					{ type: 'nack' },
					{ type: 'nack', parameter: 'pli' },
					{ type: 'goog-remb' }
				],
				parameters :
				{
					foo                  : 1234,
					'packetization-mode' : 1
				}
			},
			{
				name        : 'rtx',
				mimeType    : 'video/rtx',
				payloadType : 112,
				clockRate   : 90000,
				parameters  :
				{
					apt : 111
				}
			}
		],
		headerExtensions :
		[
			{
				uri : 'urn:ietf:params:rtp-hdrext:sdes:mid',
				id  : 1
			},
			{
				uri : 'urn:3gpp:video-orientation',
				id  : 2
			}
		],
		encodings :
		[
			{ ssrc: 11111111, rtx: { ssrc: 11111112 }, maxBitrate: 111111 },
			{ ssrc: 21111111, rtx: { ssrc: 21111112 }, maxBitrate: 222222 },
			{ rid: 'high', maxBitrate: 333333 }
		],
		rtcp :
		{
			cname : 'qwerty1234'
		}
	};

	const rtpMapping =
		ortc.getProducerRtpParametersMapping(rtpParameters, routerRtpCapabilities);

	expect(rtpMapping.codecs).toEqual(
		[
			{ payloadType: 111, mappedPayloadType: 101 },
			{ payloadType: 112, mappedPayloadType: 102 }
		]);

	expect(rtpMapping.headerExtensions).toEqual(
		[
			{ id: 1, mappedId: 5 },
			{ id: 2, mappedId: 4 }
		]);

	expect(rtpMapping.encodings[0].ssrc).toBe(11111111);
	expect(rtpMapping.encodings[0].rtxSsrc).toBe(11111112);
	expect(rtpMapping.encodings[0].rid).toBe(undefined);
	expect(rtpMapping.encodings[0].mappedSsrc).toBeType('number');
	expect(rtpMapping.encodings[1].ssrc).toBe(21111111);
	expect(rtpMapping.encodings[1].rtxSsrc).toBe(21111112);
	expect(rtpMapping.encodings[1].rid).toBe(undefined);
	expect(rtpMapping.encodings[1].mappedSsrc).toBeType('number');
	expect(rtpMapping.encodings[2].ssrc).toBe(undefined);
	expect(rtpMapping.encodings[2].rtxSsrc).toBe(undefined);
	expect(rtpMapping.encodings[2].rid).toBe('high');
	expect(rtpMapping.encodings[2].mappedSsrc).toBeType('number');

	const consumableRtpParameters = ortc.getConsumableRtpParameters(
		'video', rtpParameters, routerRtpCapabilities, rtpMapping);

	expect(consumableRtpParameters.codecs[0].name).toBe('H264');
	expect(consumableRtpParameters.codecs[0].mimeType).toBe('video/H264');
	expect(consumableRtpParameters.codecs[0].payloadType).toBe(101);
	expect(consumableRtpParameters.codecs[0].clockRate).toBe(90000);
	expect(consumableRtpParameters.codecs[0].parameters).toEqual(
		{
			foo                  : 1234,
			'packetization-mode' : 1
		});

	expect(consumableRtpParameters.codecs[1].name).toBe('rtx');
	expect(consumableRtpParameters.codecs[1].mimeType).toBe('video/rtx');
	expect(consumableRtpParameters.codecs[1].payloadType).toBe(102);
	expect(consumableRtpParameters.codecs[1].clockRate).toBe(90000);
	expect(consumableRtpParameters.codecs[1].parameters).toEqual({ apt: 101 });

	expect(consumableRtpParameters.encodings[0]).toEqual(
		{
			ssrc       : rtpMapping.encodings[0].mappedSsrc,
			maxBitrate : 111111
		});
	expect(consumableRtpParameters.encodings[1]).toEqual(
		{
			ssrc       : rtpMapping.encodings[1].mappedSsrc,
			maxBitrate : 222222
		});
	expect(consumableRtpParameters.encodings[2]).toEqual(
		{
			ssrc       : rtpMapping.encodings[2].mappedSsrc,
			maxBitrate : 333333
		});

	expect(consumableRtpParameters.rtcp).toEqual(
		{
			cname       : rtpParameters.rtcp.cname,
			reducedSize : true,
			mux         : true
		});

	const remoteRtpCapabilities =
	{
		codecs :
		[
			{
				kind                 : 'audio',
				name                 : 'opus',
				preferredPayloadType : 100,
				clockRate            : 48000,
				channels             : 2
			},
			{
				kind                 : 'video',
				name                 : 'H264',
				preferredPayloadType : 101,
				clockRate            : 90000,
				rtcpFeedback         :
				[
					{ type: 'nack' },
					{ type: 'nack', parameter: 'pli' },
					{ type: 'foo', parameter: 'FOO' }
				],
				parameters :
				{
					'packetization-mode' : 1,
					baz                  : 'LOLOLO'
				}
			},
			{
				kind                 : 'video',
				name                 : 'rtx',
				preferredPayloadType : 102,
				clockRate            : 90000,
				parameters           :
				{
					apt : 101
				}
			}
		],
		headerExtensions :
		[
			{
				kind             : 'audio',
				uri              : 'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
				preferredId      : 1,
				preferredEncrypt : false
			},
			{
				kind             : 'video',
				uri              : 'urn:ietf:params:rtp-hdrext:toffset',
				preferredId      : 2,
				preferredEncrypt : false
			},
			{
				kind             : 'video',
				uri              : 'urn:3gpp:video-orientation',
				preferredId      : 4,
				preferredEncrypt : false
			},
			{
				kind             : 'audio',
				uri              : 'urn:ietf:params:rtp-hdrext:sdes:mid',
				preferredId      : 5,
				preferredEncrypt : false
			},
			{
				kind             : 'video',
				uri              : 'urn:ietf:params:rtp-hdrext:sdes:mid',
				preferredId      : 5,
				preferredEncrypt : false
			},
			{
				kind             : 'video',
				uri              : 'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
				preferredId      : 6,
				preferredEncrypt : false
			}
		]
	};

	const consumerRtpParameters =
		ortc.getConsumerRtpParameters(consumableRtpParameters, remoteRtpCapabilities);

	expect(consumerRtpParameters.codecs[0]).toEqual(
		{
			name         : 'H264',
			mimeType     : 'video/H264',
			payloadType  : 101,
			clockRate    : 90000,
			rtcpFeedback :
			[
				{ type: 'nack' },
				{ type: 'nack', parameter: 'pli' },
				{ type: 'foo', parameter: 'FOO' }
			],
			parameters :
			{
				foo                  : 1234,
				'packetization-mode' : 1
			}
		});

	expect(consumerRtpParameters.codecs[1]).toEqual(
		{
			name         : 'rtx',
			mimeType     : 'video/rtx',
			payloadType  : 102,
			clockRate    : 90000,
			rtcpFeedback : [],
			parameters   :
			{
				apt : 101
			}
		});

	expect(consumerRtpParameters.encodings.length).toBe(1);
	expect(consumerRtpParameters.encodings[0].ssrc).toBeType('number');
	expect(consumerRtpParameters.encodings[0].rtx).toBeType('object');
	expect(consumerRtpParameters.encodings[0].rtx.ssrc).toBeType('number');

	expect(consumerRtpParameters.headerExtensions).toEqual(
		[
			{
				uri : 'urn:ietf:params:rtp-hdrext:toffset',
				id  : 2
			},
			{
				uri : 'urn:3gpp:video-orientation',
				id  : 4
			}
		]);

	expect(consumerRtpParameters.rtcp).toEqual(
		{
			cname       : rtpParameters.rtcp.cname,
			reducedSize : true,
			mux         : true
		});
});

test('getProducerRtpParametersMapping() with incompatible params throws UnsupportedError', () =>
{
	const mediaCodecs =
	[
		{
			kind      : 'audio',
			name      : 'opus',
			mimeType  : 'audio/opus',
			clockRate : 48000,
			channels  : 2
		},
		{
			kind       : 'video',
			name       : 'H264',
			mimeType   : 'video/H264',
			clockRate  : 90000,
			parameters :
			{
				'packetization-mode' : 1
			}
		}
	];

	const routerRtpCapabilities = ortc.generateRouterRtpCapabilities(mediaCodecs);

	const rtpParameters =
	{
		codecs :
		[
			{
				name         : 'VP8',
				mimeType     : 'video/VP8',
				payloadType  : 120,
				clockRate    : 90000,
				rtcpFeedback :
				[
					{ type: 'nack' },
					{ type: 'nack', parameter: 'fir' }
				]
			}
		],
		headerExtensions : [],
		encodings        :
		[
			{ ssrc: 11111111 }
		],
		rtcp :
		{
			cname : 'qwerty1234'
		}
	};

	expect(
		() => ortc.getProducerRtpParametersMapping(rtpParameters, routerRtpCapabilities))
		.toThrow(UnsupportedError);
});