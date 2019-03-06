#define MS_CLASS "RTC::PipeConsumer"
// #define MS_LOG_DEV

#include "RTC/PipeConsumer.hpp"
#include "Logger.hpp"
#include "MediaSoupErrors.hpp"

namespace RTC
{
	/* Instance methods. */

	PipeConsumer::PipeConsumer(const std::string& id, RTC::Consumer::Listener* listener, json& data)
	  : RTC::Consumer::Consumer(id, listener, data, RTC::RtpParameters::Type::PIPE)
	{
		MS_TRACE();
	}

	PipeConsumer::~PipeConsumer()
	{
		MS_TRACE();
	}

	void PipeConsumer::FillJson(json& jsonObject) const
	{
		MS_TRACE();

		// Call the parent method.
		RTC::Consumer::FillJson(jsonObject);
	}

	void PipeConsumer::FillJsonStats(json& jsonArray) const
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::FillJsonScore(json& jsonObject) const
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::HandleRequest(Channel::Request* request)
	{
		MS_TRACE();

		switch (request->methodId)
		{
			case Channel::Request::MethodId::CONSUMER_REQUEST_KEY_FRAME:
			{
				RequestKeyFrame();

				request->Accept();

				break;
			}

			default:
			{
				// Pass it to the parent class.
				RTC::Consumer::HandleRequest(request);
			}
		}
	}

	void PipeConsumer::TransportConnected()
	{
		MS_TRACE();

		RequestKeyFrame();
	}

	void PipeConsumer::ProducerNewRtpStream(RTC::RtpStream* /*rtpStream*/, uint32_t /*mappedSsrc*/)
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::ProducerRtpStreamScore(RTC::RtpStream* /*rtpStream*/, uint8_t /*score*/)
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::ProducerCname(std::string& cname)
	{
		MS_TRACE();

		this->rtpParameters.rtcp.cname = cname;
	}

	void PipeConsumer::SendRtpPacket(RTC::RtpPacket* packet)
	{
		MS_TRACE();

		if (!IsActive())
			return;

		// Send the packet.
		this->listener->OnConsumerSendRtpPacket(this, packet);
	}

	void PipeConsumer::GetRtcp(RTC::RTCP::CompoundPacket* /*packet*/, uint64_t /*now*/)
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::NeedWorstRemoteFractionLost(uint32_t /*mappedSsrc*/, uint8_t& worstRemoteFractionLost)
	{
		MS_TRACE();

		if (!IsActive())
			return;

		// If our fraction lost is worse than the given one, update it.
		if (this->fractionLost > worstRemoteFractionLost)
			worstRemoteFractionLost = this->fractionLost;
	}

	void PipeConsumer::ReceiveNack(RTC::RTCP::FeedbackRtpNackPacket* /*nackPacket*/)
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::ReceiveKeyFrameRequest(RTC::RTCP::FeedbackPs::MessageType messageType)
	{
		MS_TRACE();

		if (!IsActive())
			return;

		RequestKeyFrame();
	}

	void PipeConsumer::ReceiveRtcpReceiverReport(RTC::RTCP::ReceiverReport* report)
	{
		MS_TRACE();

		this->fractionLost = report->GetFractionLost();
	}

	uint32_t PipeConsumer::GetTransmissionRate(uint64_t now)
	{
		MS_TRACE();

		// Do nothing.
		return 0u;
	}

	float PipeConsumer::GetLossPercentage() const
	{
		MS_TRACE();

		// Do nothing.
		return 0u;
	}

	void PipeConsumer::Paused(bool /*wasProducer*/)
	{
		MS_TRACE();

		// Do nothing.
	}

	void PipeConsumer::Resumed(bool wasProducer)
	{
		MS_TRACE();

		// If we have been resumed due to the Producer becoming resumed, we don't
		// need to request a key frame since the Producer already requested it.
		if (!wasProducer)
			RequestKeyFrame();
	}

	void PipeConsumer::RequestKeyFrame()
	{
		MS_TRACE();

		if (!IsActive() || this->kind != RTC::Media::Kind::VIDEO)
			return;

		for (auto& encoding : this->consumableRtpEncodings)
		{
			auto mappedSsrc = encoding.ssrc;

			this->listener->OnConsumerKeyFrameRequested(this, mappedSsrc);
		}
	}
} // namespace RTC
