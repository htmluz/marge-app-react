import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import api from "@/services/api";
import { Button } from "./ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
}

// TODO: you know
interface DetailResponse {
  detail: CallDetail[];
}

interface CallDetail {
  sid: string;
  messages: CallMessage[];
}

interface CallMessage {
  id: number;
  raw: string;
  sid: string;
  create_date: string;
  data_header: SIPDataHeader;
  protocol_header: SIPProtocolHeader;
}

interface SIPDataHeader {
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

interface SIPProtocolHeader {
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

export function CallFlow({ open, onOpenChange, sid }: ModalProps) {
  const [callDetail, setCallDetail] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<CallMessage | null>(
    null
  );
  const [uniqueIPs, setUniqueIPs] = useState<string[]>([]);

  function getUniqueIPs(data: DetailResponse | null): string[] {
    if (!data || !data.detail) return [];

    const uIPs: string[] = [];
    const seenIPs = new Set<string>();

    for (const call of data.detail) {
      if (!call.messages) {
        continue;
      }

      for (const msg of call.messages) {
        const { srcIp, dstIp } = msg.protocol_header;
        if (srcIp && !seenIPs.has(srcIp)) {
          seenIPs.add(srcIp);
          uIPs.push(srcIp);
        }
        if (dstIp && !seenIPs.has(dstIp)) {
          seenIPs.add(dstIp);
          uIPs.push(dstIp);
        }
      }
    }
    return uIPs;
  }

  useEffect(() => {
    if (open && sid) {
      const fetchCallDetails = async () => {
        setCallDetail(null);
        setIsLoading(true);
        setError(null);
        try {
          const response = await api.get<DetailResponse>("/sip/call-detail", {
            params: {
              sids: sid,
              rtcp: false,
            },
          });
          console.log(response.data);
          setCallDetail(response.data);
          setSelectedPacket(response.data.detail[0].messages[0]);
          const orderedIPs = getUniqueIPs(response.data);
          setUniqueIPs(orderedIPs);
        } catch (e) {
          console.log(e);
          // TODO: Implement seterror
        } finally {
          setIsLoading(false);
        }
      };
      fetchCallDetails();
    } else {
      setCallDetail(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open, sid]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="selection:bg-primary selection:text-primary-foreground min-w-11/12 min-h-11/12 max-h-11/12 flex flex-col overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 overflow-hidden"
        >
          <ResizablePanel className="" minSize={40} defaultSize={75}>
            123
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            className="px-3"
            minSize={20}
            defaultSize={25}
            maxSize={60}
            collapsible
            collapsedSize={0}
          >
            <ScrollArea className="h-full">
              <div className="h-full overflow-y-auto cursor-default">
                <b>{selectedPacket && selectedPacket?.data_header.cseq}</b>
                <pre className="whitespace-pre-wrap break-all font-sans">
                  {selectedPacket && selectedPacket.raw
                    ? JSON.stringify(selectedPacket.raw)
                        .replace(/^"|"$/g, "")
                        .replace(/\\r\\n/g, "\n")
                    : ""}
                </pre>
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
}
