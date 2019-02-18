#define MS_CLASS "RTC::AudioLevelObserver"
// #define MS_LOG_DEV

#include "RTC/AudioLevelObserver.hpp"
#include "Logger.hpp"
#include "MediaSoupErrors.hpp"
#include "Channel/Notifier.hpp"
#include "RTC/RtpDictionaries.hpp"
#include <cmath> // std::lround()

namespace RTC
{
	/* Instance methods. */

	AudioLevelObserver::AudioLevelObserver(const std::string& id, json& data) : RTC::RtpObserver(id)
	{
		MS_TRACE();

		auto jsonThresholdIt = data.find("threshold");

		if (jsonThresholdIt != data.end() && jsonThresholdIt->is_number())
		{
			this->threshold = jsonThresholdIt->get<int8_t>();

			if (this->threshold < -127 || this->threshold > 0)
				MS_THROW_TYPE_ERROR("invalid threshold value %" PRIi8, this->threshold);
		}

		auto jsonIntervalIt = data.find("interval");

		if (jsonIntervalIt != data.end() && jsonIntervalIt->is_number_unsigned())
		{
			this->interval = jsonIntervalIt->get<int16_t>();

			if (this->interval < 250)
				this->interval = 250;
			else if (this->interval > 5000)
				this->interval = 5000;
		}

		this->periodicTimer = new Timer(this);

		this->periodicTimer->Start(this->interval, this->interval);
	}

	AudioLevelObserver::~AudioLevelObserver()
	{
		MS_TRACE();

		delete this->periodicTimer;
	}

	void AudioLevelObserver::AddProducer(RTC::Producer* producer)
	{
		MS_TRACE();

		if (producer->GetKind() != RTC::Media::Kind::AUDIO)
			MS_THROW_TYPE_ERROR("not an audio Producer");

		// Insert into the map.
		this->mapProducerDBovs[producer];
	}

	void AudioLevelObserver::RemoveProducer(RTC::Producer* producer)
	{
		MS_TRACE();

		// Remove from the map.
		this->mapProducerDBovs.erase(producer);

		// If this was the current loudest producer, recompute it.
		if (this->loudest.producer == producer)
			Update();
	}

	void AudioLevelObserver::ReceiveRtpPacket(RTC::Producer* producer, RTC::RtpPacket* packet)
	{
		MS_TRACE();

		uint8_t volume;
		bool voice;

		if (!packet->ReadAudioLevel(volume, voice))
			return;

		// Append to the vector of the Producer.
		auto& dBovs = this->mapProducerDBovs.at(producer);

		dBovs.totalSum += volume;
		dBovs.count++;
	}

	void AudioLevelObserver::ProducerPaused(RTC::Producer* producer)
	{
		// Remove from the map.
		this->mapProducerDBovs.erase(producer);

		// If this was the current loudest producer, recompute it.
		if (this->loudest.producer == producer)
			Update();
	}

	void AudioLevelObserver::ProducerResumed(RTC::Producer* producer)
	{
		// Insert into the map.
		this->mapProducerDBovs[producer];
	}

	void AudioLevelObserver::Paused()
	{
		MS_TRACE();

		this->periodicTimer->Stop();

		ResetMapProducerDBovs();

		if (this->loudest.producer)
		{
			ResetLoudest();

			Channel::Notifier::Emit(this->id, "silence");
		}
	}

	void AudioLevelObserver::Resumed()
	{
		MS_TRACE();

		this->periodicTimer->Restart();
	}

	void AudioLevelObserver::Update()
	{
		MS_TRACE();

		RTC::Producer* loudestProducer{ nullptr };
		int8_t loudestDBov{ -127 };

		for (auto& kv : this->mapProducerDBovs)
		{
			auto* producer = kv.first;
			auto& dBovs    = kv.second;

			if (dBovs.count < 10)
				continue;

			auto avgDBov = -1 * static_cast<int8_t>(std::lround(dBovs.totalSum / dBovs.count));

			if (avgDBov > loudestDBov)
			{
				loudestProducer = producer;
				loudestDBov     = avgDBov;
			}
		}

		// Clear the map.
		ResetMapProducerDBovs();

		if (loudestProducer && loudestDBov >= this->threshold)
		{
			this->loudest.producer = loudestProducer;
			this->loudest.dBov     = loudestDBov;

			json data = json::object();

			data["producerId"] = this->loudest.producer->id;
			data["volume"]     = this->loudest.dBov;

			Channel::Notifier::Emit(this->id, "loudest", data);
		}
		else if (this->loudest.producer)
		{
			ResetLoudest();

			Channel::Notifier::Emit(this->id, "silence");
		}
	}

	void AudioLevelObserver::ResetLoudest()
	{
		MS_TRACE();

		this->loudest.producer = nullptr;
		this->loudest.dBov     = -127;
	}

	void AudioLevelObserver::ResetMapProducerDBovs()
	{
		MS_TRACE();

		for (auto& kv : this->mapProducerDBovs)
		{
			auto& dBovs = kv.second;

			dBovs.totalSum = 0;
			dBovs.count    = 0;
		}
	}

	inline void AudioLevelObserver::OnTimer(Timer* timer)
	{
		MS_TRACE();

		if (timer == this->periodicTimer)
			Update();
	}
} // namespace RTC
