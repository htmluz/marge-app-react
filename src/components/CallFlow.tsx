import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "./ui/dialog";
import api from "@/services/api";
import { Button } from "./ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";
import { ChevronUp } from "lucide-react";
import React from "react";
import { format } from "date-fns";
import { CallMessage, DetailResponse } from "@/types/sipcalls";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  showIndex?: boolean;
  showRelativeTimestamp?: boolean;
  showIpNames?: boolean;
}

export function CallFlow({ open, onOpenChange, sid, showIndex = false, showRelativeTimestamp = false, showIpNames = true }: ModalProps) {
  const [callDetail, setCallDetail] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<CallMessage | null>(
    null
  );
  const [uniqueIPs, setUniqueIPs] = useState<string[]>([]);
  const [localShowIndex, setLocalShowIndex] = useState(showIndex);
  const [localShowRelativeTimestamp, setLocalShowRelativeTimestamp] = useState(showRelativeTimestamp);
  const [localShowIpNames, setLocalShowIpNames] = useState(showIpNames);
  const [ipMappings, setIpMappings] = useState<Record<string, string>>({});

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
    setCallDetail(null);
    setSelectedPacket(null);
    setUniqueIPs([]);
    setIpMappings({});
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
          if (response.data.detail[0].ip_mappings) {
            setIpMappings(response.data.detail[0].ip_mappings);
          }
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
      setIpMappings({});
    }
  }, [open, sid]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pb-2 selection:bg-primary selection:text-primary-foreground min-w-11/12 min-h-11/12 max-h-11/12 flex flex-col overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 overflow-hidden"
        >
          <ResizablePanel className="" minSize={40} defaultSize={75}>
            <div
              className="grid sticky bg-transparent top-0 cursor-default mr-2 overflow-y-auto"
              style={{
                gridTemplateColumns: `repeat(${uniqueIPs.length + 1}, 1fr)`,
              }}
            >
              <div className="text-center font-bold border-b border-r pb-1">
                Timestamp
              </div>
              {uniqueIPs.map((ip) => (
                <div key={ip} className="text-center font-bold border-b pb-1">
                  {ip}
                  {localShowIpNames && ipMappings[ip] && ipMappings[ip] !== ip && (
                    <div className="text-xs border-t mx-8">{ipMappings[ip]}</div>
                  )}
                </div>
              ))}
            </div>

            <ScrollArea className="h-full">
              <div className="relative">
                <div
                  className="grid cursor-default mr-2 h-full overflow-y-auto"
                  style={{
                    gridTemplateColumns: `repeat(${uniqueIPs.length + 1}, 1fr)`,
                  }}
                >
                  {uniqueIPs.map((_, idx) => (
                    <div
                      key={`column-line-${idx}`}
                      className="absolute top-0 bottom-0 border-dashed border-l pointer-events-none z-10"
                      style={{
                        left: `calc(${
                          (idx + 1.5) / (uniqueIPs.length + 1)
                        } * 100%)`,
                      }}
                    />
                  ))}
                  {callDetail?.detail[0].messages.map((msg, rowIdx, arr) => {
                    const ms =
                      msg.protocol_header.timeSeconds * 1000 +
                      msg.protocol_header.timeUseconds / 1000;
                    const timestamp = format(
                      new Date(ms).toISOString(),
                      "dd/MM/yyyy HH:mm:ss.SSS"
                    );

                    let displayTimestamp = timestamp;
                    if (localShowRelativeTimestamp) {
                      if (rowIdx === 0) {
                        displayTimestamp = "00";
                      } else {
                        const firstMsg = arr[0];
                        const firstMs =
                          firstMsg.protocol_header.timeSeconds * 1000 +
                          firstMsg.protocol_header.timeUseconds / 1000;
                        const diff = ms - firstMs;
                        if (diff < 500) {
                          displayTimestamp = `+${diff.toFixed(0)}ms`;
                        } else {
                          displayTimestamp = `+${(diff / 1000).toFixed(3)}s`;
                        }
                      }
                    }

                    const getColumnPosition = (index: number) =>
                      `${((index + 1.5) / uniqueIPs.length + 1) * 100}%`;

                    const extractSipMethod = (
                      message: string
                    ): string | null => {
                      const match = message.match(
                        /^(?:SIP\/2\.0\s+([^\r\n]+)|([A-Z]+)\s+.*SIP\/2\.0)/
                      );
                      return match ? match[1] || match[2] : null;
                    };

                    const srcIdx = uniqueIPs.indexOf(msg.protocol_header.srcIp);
                    const srcPos = getColumnPosition(srcIdx);
                    const dstIdx = uniqueIPs.indexOf(msg.protocol_header.dstIp);
                    const dstPos = getColumnPosition(dstIdx);
                    const lineStart = Math.min(
                      parseFloat(srcPos),
                      parseFloat(dstPos)
                    );
                    const lineEnd = Math.max(
                      parseFloat(srcPos),
                      parseFloat(dstPos)
                    );
                    const lineWidth = (lineEnd - lineStart) * (uniqueIPs.length );

                    return (
                      <React.Fragment key={msg.id}>
                        <div
                          className="group"
                          style={{ display: "contents" }}
                          onClick={() => setSelectedPacket(msg)}
                        >
                          <div
                            className={`text-center py-1 border-r group-hover:bg-secondary select-none ${
                              msg.id === selectedPacket?.id
                                ? "bg-secondary"
                                : ""
                            }`}
                          >
                            {localShowRelativeTimestamp ? displayTimestamp : timestamp}
                          </div>
                          {uniqueIPs.map((_, colIdx) => (
                            <div
                              key={colIdx}
                              className={`text-center relative group-hover:bg-secondary ${
                                msg.id === selectedPacket?.id
                                  ? "bg-secondary"
                                  : ""
                              }`}
                            >
                              {colIdx === srcIdx && (
                                <div className="relative">
                                  <div
                                    className="absolute z-10 mt-5 h-[2px] bg-foreground"
                                    style={{
                                      left: "51.5%",
                                      width: `${lineWidth}%`,
                                      transform:
                                        srcIdx > dstIdx
                                          ? "translateX(-100%)"
                                          : "translateX(0)",
                                    }}
                                  >
                                    <span className="absolute select-none left-1/2 transform -translate-x-1/2 -translate-y-full text-xs overflow-hidden whitespace-nowrap text-ellipsis">
                                      {localShowIndex ? `[${rowIdx + 1}] ` : ""}{extractSipMethod(msg.raw)}
                                    </span>
                                    {colIdx !== dstIdx && (
                                      <div
                                        className="absolute w-0 h-0 text-foreground"
                                        style={{
                                          top: "-4px",
                                          [srcIdx < dstIdx ? "right" : "left"]:
                                            "-1px",
                                          borderTop: "5px solid transparent",
                                          borderBottom: "5px solid transparent",
                                          [srcIdx < dstIdx
                                            ? "borderLeft"
                                            : "borderRight"]: "8px solid ",
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                              {colIdx === dstIdx && srcIdx === dstIdx && (
                                <div
                                  className={`absolute ${
                                    srcIdx < uniqueIPs.length / 2
                                      ? "left-[60%]"
                                      : "right-[50%]"
                                  } -translate-x-1/2 z-20 pointer-events-none`}
                                  style={{ top: "5px" }}
                                >
                                  <svg
                                    width="96"
                                    height="24"
                                    viewBox="0 0 40 40"
                                  >
                                    <g
                                      transform={
                                        srcIdx > uniqueIPs.length / 2
                                          ? ""
                                          : "scale(-1, 1) translate(-40, 0)"
                                      }
                                    >
                                      <path
                                        d="M 30 5 L -40 5 L -40 35 L 26 35"
                                        stroke="var(--foreground)"
                                        strokeWidth="3"
                                        fill="none"
                                      />
                                      <polygon
                                        points="32,35 24,30 24,40"
                                        fill="var(--foreground)"
                                      />
                                    </g>
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
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
        <DialogFooter className="border-t">
          <div className="pt-2 flex gap-4 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="mr-2" variant="outline">
                  View <ChevronUp />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                  checked={localShowIndex}
                  onCheckedChange={setLocalShowIndex}
                >
                  Show Indexes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={localShowRelativeTimestamp}
                  onCheckedChange={setLocalShowRelativeTimestamp}
                >
                  Relative Timestamp
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={localShowIpNames}
                  onCheckedChange={setLocalShowIpNames}
                >
                  Show IP Names
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="mr-2" variant="outline">
              Export
              <ChevronUp />{" "}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
