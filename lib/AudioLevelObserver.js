const Logger = require('./Logger');
const EnhancedEventEmitter = require('./EnhancedEventEmitter');

const logger = new Logger('AudioLevelObserver');

class AudioLevelObserver extends EnhancedEventEmitter
{
	/**
	 * @private
	 *
	 * @emits {producer: Producer, volume: Number} loudest
	 * @emits silence
	 * @emits routerclose
	 * @emits @close
	 */
	constructor({ internal, data, channel, getRouterProducerById })
	{
		super(logger);

		logger.debug('constructor()');

		// Internal data.
		// @type {Object}
		// - .routerId
		// - .rtpObserverId
		this._internal = internal;

		// AudioLevelObserver data.
		// @type {Object}
		// - .threshold
		// - .interval
		this._data = data;

		// Channel instance.
		// @type {Channel}
		this._channel = channel;

		// Closed flag.
		// @type {Boolean}
		this._closed = false;

		// Paused flag.
		// @type {Boolean}
		this._paused = false;

		// Function that gets any Producer in the Router.
		// @type {Function: Producer}
		this._getRouterProducerById = getRouterProducerById;

		this._handleWorkerNotifications();
	}

	/**
	 * AudioLevelObserver id.
	 *
	 * @returns {String}
	 */
	get id()
	{
		return this._internal.rtpObserverId;
	}

	/**
	 * Whether the AudioLevelObserver is closed.
	 *
	 * @returns {Boolean}
	 */
	get closed()
	{
		return this._closed;
	}

	/**
	 * Minimum volume (in dBvo) to be considered.
	 *
	 * @returns {Number}
	 */
	get threshold()
	{
		return this._data.threshold;
	}

	/**
	 * Interval in ms for checking audio volumes.
	 *
	 * @returns {Number}
	 */
	get interval()
	{
		return this._data.interval;
	}

	/**
	 * Whether the AudioLevelObserver is paused.
	 *
	 * @returns {Boolean}
	 */
	get paused()
	{
		return this._paused;
	}

	/**
	 * Close the AudioLevelObserver.
	 */
	close()
	{
		if (this._closed)
			return;

		logger.debug('close()');

		this._closed = true;

		// Remove notification subscriptions.
		this._channel.removeAllListeners(this._internal.rtpObserverId);

		this._channel.request('rtpObserver.close', this._internal)
			.catch(() => {});

		this.emit('@close');
	}

	/**
	 * Router was closed.
	 *
	 * @private
	 */
	routerClosed()
	{
		if (this._closed)
			return;

		logger.debug('routerClosed()');

		this._closed = true;

		// Remove notification subscriptions.
		this._channel.removeAllListeners(this._internal.rtpObserverId);

		this.safeEmit('routerclose');
	}

	async pause()
	{
		if (this._paused)
			return;

		logger.debug('pause()');

		await this._channel.request('rtpObserver.pause', this._internal);

		this._paused = true;
	}

	async resume()
	{
		if (!this._paused)
			return;

		logger.debug('resume()');

		await this._channel.request('rtpObserver.resume', this._internal);

		this._paused = false;
	}

	async addProducer({ producerId } = {})
	{
		logger.debug('addProducer()');

		const internal = { ...this._internal, producerId };

		await this._channel.request('rtpObserver.addProducer', internal);
	}

	async removeProducer({ producerId } = {})
	{
		logger.debug('removeProducer()');

		const internal = { ...this._internal, producerId };

		await this._channel.request('rtpObserver.removeProducer', internal);
	}

	/**
	 * @private
	 */
	_handleWorkerNotifications()
	{
		this._channel.on(this._internal.rtpObserverId, (event, data) =>
		{
			switch (event)
			{
				case 'loudest':
				{
					const { producerId, volume } = data;
					const producer = this._getRouterProducerById(producerId);

					if (!producer)
						break;

					this.safeEmit('loudest', producer, volume);

					break;
				}

				case 'silence':
				{
					this.safeEmit('silence');

					break;
				}

				default:
				{
					logger.error('ignoring unknown event "%s"', event);
				}
			}
		});
	}
}

module.exports = AudioLevelObserver;
