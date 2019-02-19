#ifndef MS_RTC_AUDIO_LEVEL_OBSERVER_HPP
#define MS_RTC_AUDIO_LEVEL_OBSERVER_HPP

#include "json.hpp"
#include "RTC/RtpObserver.hpp"
#include "handles/Timer.hpp"
#include <unordered_map>

using json = nlohmann::json;

namespace RTC
{
	class AudioLevelObserver : public RTC::RtpObserver, public Timer::Listener
	{
	private:
		struct DBovs
		{
			uint16_t totalSum{ 0 }; // Sum of dBvos (positive integer).
			size_t count{ 0 };      // Number of dBvos entries in totalSum.
		};

	public:
		AudioLevelObserver(const std::string& id, json& data);
		~AudioLevelObserver() override;

	public:
		uint16_t GetMaxEntries() const;
		int8_t GetThreshold() const;
		uint16_t GetInterval() const;
		void AddProducer(RTC::Producer* producer) override;
		void RemoveProducer(RTC::Producer* producer) override;
		void ReceiveRtpPacket(RTC::Producer* producer, RTC::RtpPacket* packet) override;
		void ProducerPaused(RTC::Producer* producer) override;
		void ProducerResumed(RTC::Producer* producer) override;

	private:
		void Paused() override;
		void Resumed() override;
		void Update();
		void ResetMapProducerDBovs();

		/* Pure virtual methods inherited from Timer. */
	protected:
		void OnTimer(Timer* timer) override;

	private:
		// Passed by argument.
		uint16_t maxEntries{ 1 };
		int8_t threshold{ -80 };
		uint16_t interval{ 1000 };
		// Allocated by this.
		Timer* periodicTimer{ nullptr };
		// Others.
		std::unordered_map<RTC::Producer*, DBovs> mapProducerDBovs;
		bool silence{ true };
	};

	/* Inline methods. */

	inline uint16_t AudioLevelObserver::GetMaxEntries() const
	{
		return this->maxEntries;
	}

	inline int8_t AudioLevelObserver::GetThreshold() const
	{
		return this->threshold;
	}

	inline uint16_t AudioLevelObserver::GetInterval() const
	{
		return this->interval;
	}
} // namespace RTC

#endif
