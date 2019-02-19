const Logger = require('./Logger');
const EnhancedEventEmitter = require('./EnhancedEventEmitter');

const logger = new Logger('AudioLevelObserver');

class AudioLevelObserver extends EnhancedEventEmitter
{
	/**
	 * @private
	 *
	 * @emits {volumes: Array<Object<producer: Producer, volume: Number>>} volumes
	 * @emits silence
	 * @emits routerclose
	 * @emits @close
	 */
	constructor({ internal, channel, getProducerById })
	{
		super(logger);

		logger.debug('constructor()');

		// Internal data.
		// @type {Object}
		// - .routerId
		// - .rtpObserverId
		this._internal = internal;

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
		this._getProducerById = getProducerById;

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

	/**
	 * Pause the AudioLevelObserver.
	 *
	 * @async
	 */
	async pause()
	{
		if (this._paused)
			return;

		logger.debug('pause()');

		await this._channel.request('rtpObserver.pause', this._internal);

		this._paused = true;
	}

	/**
	 * Resume the AudioLevelObserver.
	 *
	 * @async
	 */
	async resume()
	{
		if (!this._paused)
			return;

		logger.debug('resume()');

		await this._channel.request('rtpObserver.resume', this._internal);

		this._paused = false;
	}

	/**
	 * Add a Producer to the AudioLevelObserver.
	 *
	 * @param {String} producerId - The id of an audio Producer.
	 *
	 * @async
	 */
	async addProducer({ producerId } = {})
	{
		logger.debug('addProducer()');

		const internal = { ...this._internal, producerId };

		await this._channel.request('rtpObserver.addProducer', internal);
	}

	/**
	 * Remove a Producer from the AudioLevelObserver.
	 *
	 * @param {String} producerId - The id of an audio Producer.
	 *
	 * @async
	 */
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
				case 'volumes':
				{
					const volumes = data
						.map(({ producerId, volume }) => (
							{
								producer : this._getProducerById(producerId),
								volume
							}
						))
						.filter((entry) => entry.producer);

					if (volumes.length > 0)
						this.safeEmit('volumes', volumes);

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
