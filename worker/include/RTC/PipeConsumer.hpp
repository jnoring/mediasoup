#ifndef MS_RTC_PIPE_CONSUMER_HPP
#define MS_RTC_PIPE_CONSUMER_HPP

#include "RTC/Consumer.hpp"

namespace RTC
{
	class PipeConsumer : public RTC::Consumer
	{
	public:
		PipeConsumer(const std::string& id, RTC::Consumer::Listener* listener, json& data);
		~PipeConsumer() override;

	public:
		void FillJson(json& jsonObject) const override;
		void FillJsonStats(json& jsonArray) const override;
		void FillJsonScore(json& jsonObject) const override;
		void HandleRequest(Channel::Request* request) override;
		void TransportConnected() override;
		void ProducerNewRtpStream(RTC::RtpStream* rtpStream, uint32_t mappedSsrc) override;
		void ProducerRtpStreamScore(RTC::RtpStream* rtpStream, uint8_t score) override;
		void ProducerCname(std::string& cname) override;
		void SendRtpPacket(RTC::RtpPacket* packet) override;
		void GetRtcp(RTC::RTCP::CompoundPacket* packet, uint64_t now) override;
		void NeedWorstRemoteFractionLost(uint32_t mappedSsrc, uint8_t& worstRemoteFractionLost) override;
		void ReceiveNack(RTC::RTCP::FeedbackRtpNackPacket* nackPacket) override;
		void ReceiveKeyFrameRequest(RTC::RTCP::FeedbackPs::MessageType messageType) override;
		void ReceiveRtcpReceiverReport(RTC::RTCP::ReceiverReport* report) override;
		uint32_t GetTransmissionRate(uint64_t now) override;
		float GetLossPercentage() const override;

	private:
		void Paused(bool wasProducer) override;
		void Resumed(bool wasProducer) override;
		void RequestKeyFrame();

	private:
		uint8_t fractionLost{ 0 };
	};
} // namespace RTC

#endif
