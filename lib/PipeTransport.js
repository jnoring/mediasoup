const Logger = require('./Logger');
const Transport = require('./Transport');

const logger = new Logger('PipeTransport');

class PipeTransport extends Transport
{
	/**
	 * @private
	 */
	constructor({ data, ...params })
	{
		super(params);

		logger.debug('constructor()');

		// PipeTransport data.
		// @type {Object}
		// - .tuple
		//   - .localIp
		//   - .localPort
		//   - .remoteIp
		//   - .remotePort
		//   - .protocol
		this._data =
		{
			tuple : data.tuple
		};
	}

	/**
	 * @returns {Object}
	 */
	get tuple()
	{
		return this._data.tuple;
	}

	/**
	 * Provide the PipeTransport remote parameters.
	 *
	 * @param {String} ip - Remote IP.
	 * @param {Number} port - Remote port.
	 *
	 * @async
	 * @override
	 */
	async connect({ ip, port } = {})
	{
		logger.debug('connect()');

		const reqData = { ip, port };

		const data =
			await this._channel.request('transport.connect', this._internal, reqData);

		// Update data.
		this._data.tuple = data.tuple;
	}

	/**
	 * @private
	 * @override
	 */
	_handleWorkerNotifications()
	{
		// No need to subscribe to any event.
	}
}

module.exports = PipeTransport;
