#ifndef MS_RTC_RTP_STREAM_SEND_HPP
#define MS_RTC_RTP_STREAM_SEND_HPP

#include "Utils.hpp"
#include "RTC/RTCP/ReceiverReport.hpp"
#include "RTC/RTCP/SenderReport.hpp"
#include "RTC/RtpStream.hpp"
#include <list>
#include <vector>

namespace RTC
{
	class RtpStreamSend : public RtpStream, public RtpStreamMonitor::Listener
	{
	public:
		class Listener
		{
		public:
			virtual void OnRtpStreamSendScore(const RtpStreamSend* rtpStream, uint8_t score) = 0;
		};

	private:
		struct StorageItem
		{
			uint8_t store[RTC::MtuSize];
		};

	private:
		struct BufferItem
		{
			uint16_t seq{ 0 }; // RTP seq.
			uint64_t resentAtTime{ 0 };
			RTC::RtpPacket* packet{ nullptr };
		};

	public:
		RtpStreamSend(Listener* listener, RTC::RtpStream::Params& params, size_t bufferSize);
		~RtpStreamSend() override;

		void FillJsonStats(json& jsonObject) override;
		void SetRtx(uint8_t payloadType, uint32_t ssrc) override;
		bool ReceivePacket(RTC::RtpPacket* packet) override;
		void RtpPacketRepaired(RTC::RtpPacket* packet) override;
		void ReceiveRtcpReceiverReport(RTC::RTCP::ReceiverReport* report);
		void RequestRtpRetransmission(
		  uint16_t seq, uint16_t bitmask, std::vector<RTC::RtpPacket*>& container);
		RTC::RTCP::SenderReport* GetRtcpSenderReport(uint64_t now);
		void ClearRetransmissionBuffer();
		void RtxEncode(RtpPacket* packet);

	private:
		void StorePacket(RTC::RtpPacket* packet);

		/* Pure virtual methods inherited from RtpStream. */
	protected:
		void OnTimer(Timer* timer) override;

		/* Pure virtual methods inherited from RtpStreamMonitor */
	protected:
		void OnRtpStreamMonitorScore(const RtpStreamMonitor* rtpMonitor, uint8_t score) override;

	private:
		Listener* listener{ nullptr };
		std::vector<StorageItem> storage;
		std::list<BufferItem> buffer;
		float rtt{ 0 };
		uint16_t rtxSeq{ 0 };
	};

	inline void RtpStreamSend::SetRtx(uint8_t payloadType, uint32_t ssrc)
	{
		RtpStream::SetRtx(payloadType, ssrc);

		this->rtxSeq = Utils::Crypto::GetRandomUInt(0u, 0xFFFF);
	}

	inline void RtpStreamSend::RtpPacketRepaired(RTC::RtpPacket* packet)
	{
		RtpStream::RtpPacketRepaired(packet);

		this->rtpMonitor->RtpPacketRepaired(packet);
	}

	inline void RtpStreamSend::OnRtpStreamMonitorScore(const RtpStreamMonitor* /*rtpMonitor*/, uint8_t score)
	{
		if (score != this->lastScore)
			this->listener->OnRtpStreamSendScore(this, score);

		this->lastScore = score;
	}
} // namespace RTC

#endif
