export interface DetailResponse {
  detail: CallDetail[];
}

export interface CallDetail {
  sid: string;
  messages: CallMessage[];
  ip_mappings?: Record<string, string>;
}

export interface CallMessage {
  id: number;
  raw: string;
  sid: string;
  create_date: string;
  data_header: SIPDataHeader;
  protocol_header: ProtocolHeader;
}

export interface SIPDataHeader {
  cseq: string;
  callid: string;
  method: string;
  to_user: string;
  from_tag: string;
  from_user: string;
  ruri_user: string;
  user_agent: string;
  ruri_domain: string;
}

export interface ProtocolHeader {
  dstIp: string;
  srcIp: string;
  dstPort: number;
  srcPort: number;
  protocol: number;
  captureId: string;
  capturePass: string;
  payloadType: number;
  timeSeconds: number;
  timeUseconds: number;
  correlation_id: string;
  protocolFamily: number;
}

export interface RtcpResponse {
  streams: RtcpStreams[];
}

export interface RtcpStreams {
  src_ip: string;
  src_port: string;
  dst_ip: string;
  dst_port: string;
  streams: RtcpStream[];
}

export interface RtcpStream {
  raw: RtcpRaw;
  timestamp: string;
}

export interface RtcpRaw {
  ssrc: number;
  type: number;
  sdes_ssrc: number;
  report_count: number;
  report_blocks: RtcpReportBlocks[];
  report_blocks_xr: RtcpReportBlocksXr;
  sender_information: RtcpSenderInformation;
  mos: number;
}

export interface RtcpReportBlocks {
  lsr: number;
  dlsr: number;
  source_ssrc: number;
  packets_lost: number;
  fractions_lost: number;
  highest_seq_no: number;
}

export interface RtcpReportBlocksXr {
  id: number;
  type: number;
  gap_density: number;
  gap_duration: number;
  burst_density: number;
  fraction_lost: number;
  burst_duration: number;
  end_system_delay: number;
  fraction_discard: number;
  round_trip_delay: number;
}

export interface RtcpSenderInformation {
  octets: number;
  packets: number;
  rtp_timestamp: number;
  ntp_timestamp_sec: number;
  ntp_timestamp_usec: number;
}

export interface DataHeader {
  node: string;
  proto: string;
}
