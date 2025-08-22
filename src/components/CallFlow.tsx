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
import { toApiIsoString } from "@/services/date";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sids: string | string[];
  showIndex?: boolean;
  showRelativeTimestamp?: boolean;
  showIpNames?: boolean;
  isWatchMode?: boolean;
  watchConfig?: {
    domain: string;
    users: string[];
  };
}

// Custom hook for managing view options with localStorage
function useViewOptions(initialOptions: {
  showIndex: boolean;
  showRelativeTimestamp: boolean;
  showIpNames: boolean;
  showCallColors: boolean;
}) {
  const [options, setOptions] = useState(() => {
    // Try to load from localStorage on initial render
    try {
      const stored = localStorage.getItem('callFlowViewOptions');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with initial options to handle new options that might be added
        return { ...initialOptions, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load view options from localStorage:', error);
    }
    return initialOptions;
  });

  const updateOption = (key: keyof typeof options, value: boolean) => {
    setOptions((prev: typeof options) => {
      const newOptions = { ...prev, [key]: value };
      // Save to localStorage
      try {
        localStorage.setItem('callFlowViewOptions', JSON.stringify(newOptions));
      } catch (error) {
        console.warn('Failed to save view options to localStorage:', error);
      }
      return newOptions;
    });
  };

  return [options, updateOption] as const;
}

export function CallFlow({ open, onOpenChange, sids, showIndex = false, showRelativeTimestamp = false, showIpNames = false, isWatchMode = false, watchConfig }: ModalProps) {
  const [callDetail, setCallDetail] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<CallMessage | null>(
    null
  );
  const [uniqueIPs, setUniqueIPs] = useState<string[]>([]);
  const [ipMappings, setIpMappings] = useState<Record<string, string>>({});
  
  // Watch mode state
  const [watchData, setWatchData] = useState<CallMessage[]>([]);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(10000); // Default 10 seconds
  
  // Maximum number of messages to keep in watch mode
  const MAX_WATCH_MESSAGES = 128;

  // Use the custom hook for view options
  const [viewOptions, updateViewOption] = useViewOptions({
    showIndex,
    showRelativeTimestamp,
    showIpNames,
    showCallColors: false
  });

  // Color palette for different calls
  const callColors = [
    "rgb(239, 68, 68)", // red-500
    "rgb(59, 130, 246)", // blue-500
    "rgb(16, 185, 129)", // emerald-500
    "rgb(245, 158, 11)", // amber-500
    "rgb(139, 92, 246)", // violet-500
    "rgb(236, 72, 153)", // pink-500
  ];

  // Function to get color for a specific call SID
  const getCallColor = (callSid: string): string => {
    if (!viewOptions.showCallColors || !Array.isArray(sids) || sids.length <= 1) {
      return "var(--foreground)"; // Default color
    }
    
    const callIndex = sids.indexOf(callSid);
    if (callIndex === -1) return "var(--foreground)";
    
    return callColors[callIndex % callColors.length];
  };

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

  function getAllMessages(data: DetailResponse | null): CallMessage[] {
    if (!data || !data.detail) return [];

    const allMessages: CallMessage[] = [];
    for (const call of data.detail) {
      if (call.messages) {
        // Add call SID to each message for identification
        const messagesWithCallId = call.messages.map(msg => ({
          ...msg,
          callSid: call.sid
        }));
        allMessages.push(...messagesWithCallId);
      }
    }
    
    // Sort messages by timestamp
    return allMessages.sort((a, b) => {
      const timeA = a.protocol_header.timeSeconds * 1000 + a.protocol_header.timeUseconds / 1000;
      const timeB = b.protocol_header.timeSeconds * 1000 + b.protocol_header.timeUseconds / 1000;
      return timeA - timeB;
    });
  }

  function mergeIpMappings(data: DetailResponse | null): Record<string, string> {
    if (!data || !data.detail) return {};

    const mergedMappings: Record<string, string> = {};
    for (const call of data.detail) {
      if (call.ip_mappings) {
        Object.assign(mergedMappings, call.ip_mappings);
      }
    }
    return mergedMappings;
  }

  // Watch mode functions
  const fetchWatchData = async (startTime: Date, endTime: Date) => {
    if (!watchConfig?.domain) return;

    try {
      console.debug("[DEBUG] - fetchWatchData -", startTime.toISOString(), endTime.toISOString()) 
      const params = new URLSearchParams();
      params.append("domain", watchConfig.domain);
      params.append("start_date", toApiIsoString(startTime.toISOString()));
      params.append("end_date", toApiIsoString(endTime.toISOString()));
      
      if (watchConfig.users.length > 0) {
        params.append("users", watchConfig.users.join(","));
      }

      const response = await api.get<{ data: CallMessage[] }>("/sip/registers-watch", { params });
      console.debug(response.data.data)
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching watch data:", error);
      return [];
    }
  };

  const startWatching = async () => {
    if (!watchConfig?.domain) return;

    console.debug("[DEBUG] - startWatching called");
    
    // Clear any existing interval first
    if (refreshInterval) {
      console.debug("[DEBUG] - Clearing existing interval before starting new one");
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    setIsWatching(true);
    setLastRefreshTime(new Date());
    
    // Initial fetch for last 10 seconds
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 10000); // 10 seconds ago
    
    const initialData = await fetchWatchData(startTime, endTime);
    console.debug("[DEBUG] - Initial data loaded:", initialData?.length || 0, "messages");
    if (initialData && initialData.length > 0) {
      console.debug("[DEBUG] - Initial message IDs:", initialData.map(msg => msg.id));
      // Check for duplicates in initial data
      const initialIds = initialData.map(msg => msg.id);
      const uniqueInitialIds = new Set(initialIds);
      if (initialIds.length !== uniqueInitialIds.size) {
        console.debug("[DEBUG] - WARNING: Duplicates found in initial data!");
        console.debug("[DEBUG] - Duplicate IDs:", initialIds.filter((id, index) => initialIds.indexOf(id) !== index));
      }
    }
    setWatchData(initialData || []);
    setLastRefreshTime(endTime);

    // Set up interval for continuous updates using the current refresh interval
    const interval = setInterval(async () => {
      const currentTime = new Date();
      const newData = await fetchWatchData(lastRefreshTime || endTime, currentTime);
      
      if (newData && newData.length > 0) {
        console.debug("[DEBUG] - Adding new messages:", newData.length, "messages");
        
        setWatchData(prev => {
          console.debug("[DEBUG] - Current watch data count:", prev.length);
          
          // Check for duplicates using the current state
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewData = newData.filter(msg => !existingIds.has(msg.id));
          
          console.debug("[DEBUG] - Unique new messages:", uniqueNewData.length, "messages");
          console.debug("[DEBUG] - Duplicate messages filtered out:", newData.length - uniqueNewData.length);
          
          if (uniqueNewData.length > 0) {
            console.debug("[DEBUG] - Setting new watch data. Current count:", prev.length, "Adding:", uniqueNewData.length);
            console.debug("[DEBUG] - New message IDs:", uniqueNewData.map(msg => msg.id));
            
            const newData = [...prev, ...uniqueNewData];
            console.debug("[DEBUG] - New total count after merge:", newData.length);
            
            // Check for duplicates in the merged data
            const allIds = newData.map(msg => msg.id);
            const uniqueIds = new Set(allIds);
            if (allIds.length !== uniqueIds.size) {
              console.debug("[DEBUG] - WARNING: Duplicates found after merge!");
              console.debug("[DEBUG] - Duplicate IDs:", allIds.filter((id, index) => allIds.indexOf(id) !== index));
            }
            
            // Limit to MAX_WATCH_MESSAGES and remove older messages if needed
            if (newData.length > MAX_WATCH_MESSAGES) {
              const messagesToRemove = newData.length - MAX_WATCH_MESSAGES;
              console.debug("[DEBUG] - Removing", messagesToRemove, "older messages to maintain limit of", MAX_WATCH_MESSAGES);
              const limitedData = newData.slice(messagesToRemove);
              console.debug("[DEBUG] - Final count after limiting:", limitedData.length);
              return limitedData;
            }
            
            return newData;
          }
          
          return prev; // Return unchanged if no unique data
        });
      }
      
      setLastRefreshTime(currentTime);
    }, refreshIntervalMs);

    setRefreshInterval(interval);
  };

  const restartWatching = async () => {
    if (isWatching) {
      stopWatching();
      await startWatching();
    }
  };

  const stopWatching = () => {
    console.debug("[DEBUG] - stopWatching called");
    setIsWatching(false);
    if (refreshInterval) {
      console.debug("[DEBUG] - Clearing interval:", refreshInterval);
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    } else {
      console.debug("[DEBUG] - No interval to clear");
    }
  };

  useEffect(() => {
    setCallDetail(null);
    setSelectedPacket(null);
    setUniqueIPs([]);
    setIpMappings({});
    setWatchData([]);
    setLastRefreshTime(null);
    
    if (open) {
      if (isWatchMode && watchConfig?.domain) {
        // Start watch mode
        startWatching();
      } else if (sids) {
        // Normal call detail mode
        const fetchCallDetails = async () => {
          setCallDetail(null);
          setIsLoading(true);
          setError(null);
          try {
            // Convert sids to string if it's an array
            const sidsParam = Array.isArray(sids) ? sids.join(',') : sids;
            
            const response = await api.get<DetailResponse>("/sip/call-detail", {
              params: {
                sids: sidsParam,
                rtcp: false,
              },
            });
            console.log(response.data);
            setCallDetail(response.data);
            
            // Get all messages and set the first one as selected
            const allMessages = getAllMessages(response.data);
            if (allMessages.length > 0) {
              setSelectedPacket(allMessages[0]);
            }
            
            const orderedIPs = getUniqueIPs(response.data);
            setUniqueIPs(orderedIPs);
            
            const mergedMappings = mergeIpMappings(response.data);
            setIpMappings(mergedMappings);
          } catch (e) {
            console.log(e);
            // TODO: Implement seterror
          } finally {
            setIsLoading(false);
          }
        };
        fetchCallDetails();
      }
    } else {
      // Cleanup when modal closes
      console.debug("[DEBUG] - Modal closing, cleaning up");
      setCallDetail(null);
      setError(null);
      setIsLoading(false);
      setIpMappings({});
      setWatchData([]);
      setLastRefreshTime(null);
      stopWatching();
    }
  }, [open, sids, isWatchMode, watchConfig?.domain]);

  // Cleanup interval on unmount
  useEffect(() => {
    console.debug("[DEBUG] - Component mounted, cleanup function registered");
    return () => {
      console.debug("[DEBUG] - Component unmounting, calling stopWatching");
      stopWatching();
    };
  }, []);

  // Restart watching when refresh interval changes
  useEffect(() => {
    if (isWatchMode && isWatching) {
      restartWatching();
    }
  }, [refreshIntervalMs]);

  // Get all messages from all calls
  const allMessages = getAllMessages(callDetail);

  // Get messages for watch mode
  const getWatchMessages = (): CallMessage[] => {
    if (!isWatchMode || !watchData.length) return [];
    
    // Sort watch messages by timestamp
    const sortedMessages = watchData.sort((a, b) => {
      const timeA = a.protocol_header.timeSeconds * 1000 + a.protocol_header.timeUseconds / 1000;
      const timeB = b.protocol_header.timeSeconds * 1000 + b.protocol_header.timeUseconds / 1000;
      return timeA - timeB;
    });
    
    // Debug: Check for duplicate IDs in sorted messages
    const messageIds = sortedMessages.map(msg => msg.id);
    const uniqueIds = new Set(messageIds);
    if (messageIds.length !== uniqueIds.size) {
      console.debug("[DEBUG] - Duplicate IDs found in sorted messages!");
      console.debug("[DEBUG] - Total messages:", messageIds.length);
      console.debug("[DEBUG] - Unique IDs:", uniqueIds.size);
      console.debug("[DEBUG] - Duplicate IDs:", messageIds.filter((id, index) => messageIds.indexOf(id) !== index));
    }
    
    return sortedMessages;
  };

  // Get unique IPs for watch mode
  const getWatchUniqueIPs = (): string[] => {
    if (!isWatchMode || !watchData.length) return [];

    const uIPs: string[] = [];
    const seenIPs = new Set<string>();

    for (const msg of watchData) {
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
    return uIPs;
  };

  // Use appropriate data based on mode
  const messages = isWatchMode ? getWatchMessages() : allMessages;
  const uniqueIPsToUse = isWatchMode ? getWatchUniqueIPs() : uniqueIPs;

  // Debug: Check final messages array for duplicates
  if (isWatchMode && messages.length > 0) {
    const finalMessageIds = messages.map(msg => msg.id);
    const uniqueFinalIds = new Set(finalMessageIds);
    if (finalMessageIds.length !== uniqueFinalIds.size) {
      console.debug("[DEBUG] - CRITICAL: Duplicate IDs in final messages array!");
      console.debug("[DEBUG] - Total messages to render:", finalMessageIds.length);
      console.debug("[DEBUG] - Unique IDs:", uniqueFinalIds.size);
      console.debug("[DEBUG] - Duplicate IDs:", finalMessageIds.filter((id, index) => finalMessageIds.indexOf(id) !== index));
    }
  }

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
                gridTemplateColumns: `repeat(${uniqueIPsToUse.length + 1}, 1fr)`,
              }}
            >
              <div className="text-center font-bold border-b border-r pb-1">
                Timestamp
              </div>
              {uniqueIPsToUse.map((ip) => (
                <div key={ip} className="text-center font-bold border-b pb-1">
                  {ip}
                  {viewOptions.showIpNames && ipMappings[ip] && ipMappings[ip] !== ip && (
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
                    gridTemplateColumns: `repeat(${uniqueIPsToUse.length + 1}, 1fr)`,
                  }}
                >
                  {uniqueIPsToUse.map((_, idx) => (
                    <div
                      key={`column-line-${idx}`}
                      className="absolute top-0 bottom-0 border-dashed border-l pointer-events-none z-10"
                      style={{
                        left: `calc(${
                          (idx + 1.5) / (uniqueIPsToUse.length + 1)
                        } * 100%)`,
                      }}
                    />
                  ))}
                  {messages.map((msg, rowIdx, arr) => {
                    const ms =
                      msg.protocol_header.timeSeconds * 1000 +
                      msg.protocol_header.timeUseconds / 1000;
                    const timestamp = format(
                      new Date(ms).toISOString(),
                      "dd/MM/yyyy HH:mm:ss.SSS"
                    );

                    let displayTimestamp = timestamp;
                    if (viewOptions.showRelativeTimestamp) {
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
                      `${((index + 1.5) / uniqueIPsToUse.length + 1) * 100}%`;

                    const extractSipMethod = (
                      message: string
                    ): string | null => {
                      const match = message.match(
                        /^(?:SIP\/2\.0\s+([^\r\n]+)|([A-Z]+)\s+.*SIP\/2\.0)/
                      );
                      return match ? match[1] || match[2] : null;
                    };

                    const srcIdx = uniqueIPsToUse.indexOf(msg.protocol_header.srcIp);
                    const srcPos = getColumnPosition(srcIdx);
                    const dstIdx = uniqueIPsToUse.indexOf(msg.protocol_header.dstIp);
                    const dstPos = getColumnPosition(dstIdx);
                    const lineStart = Math.min(
                      parseFloat(srcPos),
                      parseFloat(dstPos)
                    );
                    const lineEnd = Math.max(
                      parseFloat(srcPos),
                      parseFloat(dstPos)
                    );
                    const lineWidth = (lineEnd - lineStart) * (uniqueIPsToUse.length );

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
                            {viewOptions.showRelativeTimestamp ? displayTimestamp : timestamp}
                          </div>
                          {uniqueIPsToUse.map((_, colIdx) => (
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
                                    className="absolute z-10 mt-5 h-[2px]"
                                    style={{
                                      left: "51.5%",
                                      width: `${lineWidth}%`,
                                      transform:
                                        srcIdx > dstIdx
                                          ? "translateX(-100%)"
                                          : "translateX(0)",
                                      backgroundColor: getCallColor((msg as any).callSid || ""),
                                    }}
                                  >
                                    <span className="absolute select-none left-1/2 transform -translate-x-1/2 -translate-y-full text-xs overflow-hidden whitespace-nowrap text-ellipsis">
                                      {viewOptions.showIndex ? `[${rowIdx + 1}] ` : ""}{extractSipMethod(msg.raw)}
                                    </span>
                                    {colIdx !== dstIdx && (
                                      <div
                                        className="absolute w-0 h-0"
                                        style={{
                                          top: "-4px",
                                          [srcIdx < dstIdx ? "right" : "left"]:
                                            "-1px",
                                          borderTop: "5px solid transparent",
                                          borderBottom: "5px solid transparent",
                                          [srcIdx < dstIdx
                                            ? "borderLeft"
                                            : "borderRight"]: `8px solid ${getCallColor((msg as any).callSid || "")}`,
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                              {colIdx === dstIdx && srcIdx === dstIdx && (
                                <div
                                  className={`absolute ${
                                    srcIdx < uniqueIPsToUse.length / 2
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
                                        srcIdx > uniqueIPsToUse.length / 2
                                          ? ""
                                          : "scale(-1, 1) translate(-40, 0)"
                                      }
                                    >
                                      <path
                                        d="M 30 5 L -40 5 L -40 35 L 26 35"
                                        stroke={getCallColor((msg as any).callSid || "")}
                                        strokeWidth="3"
                                        fill="none"
                                      />
                                      <polygon
                                        points="32,35 24,30 24,40"
                                        fill={getCallColor((msg as any).callSid || "")}
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
                  {messages.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      {isWatchMode ? 'No SIP register messages received yet. Watching for new messages...' : 'No messages found for the selected calls.'}
                    </div>
                  )}
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
            {isWatchMode ? (
              <div className="p-2 rounded my-auto text-center align-center select-none flex gap-2">
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isWatching ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm text-muted-foreground">
                    {isWatching ? 'Watching' : 'Stopped'} - {watchConfig?.domain}
                  </span>
                  {watchConfig?.users && watchConfig.users.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      (Users: {watchConfig.users.join(', ')})
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {messages.length} messages received
                </p>
              </div>
            ) : (
              Array.isArray(sids) && sids.length > 1 && (
                <div className="p-2 rounded my-auto text-center align-center select-none flex gap-2">
                  {viewOptions.showCallColors && (
                    <div className="flex flex-wrap gap-2 justify-center mt-1">
                      {sids.map((sid, index) => (
                        <div key={sid} className="flex items-center gap-1 text-xs">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: callColors[index % callColors.length] }}
                          />
                          <span className="text-muted-foreground">
                            {sid.split('@')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {sids.length} selected calls with {messages.length} total messages
                  </p>
                </div>
              )
            )}
          <div className="pt-2 flex gap-2 items-center">
            {isWatchMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="mr-2" variant="outline">
                    Refresh: {refreshIntervalMs / 1000}s <ChevronUp />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={refreshIntervalMs === 5000}
                    onCheckedChange={() => setRefreshIntervalMs(5000)}
                  >
                    5 seconds
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={refreshIntervalMs === 10000}
                    onCheckedChange={() => setRefreshIntervalMs(10000)}
                  >
                    10 seconds
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={refreshIntervalMs === 30000}
                    onCheckedChange={() => setRefreshIntervalMs(30000)}
                  >
                    30 seconds
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={refreshIntervalMs === 60000}
                    onCheckedChange={() => setRefreshIntervalMs(60000)}
                  >
                    1 minute
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {isWatchMode && (
              <Button 
                className="mr-2" 
                variant={isWatching ? "destructive" : "default"}
                onClick={isWatching ? stopWatching : startWatching}
              >
                {isWatching ? "Stop Watching" : "Start Watching"}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="mr-2" variant="outline">
                  View <ChevronUp />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                  checked={viewOptions.showIndex}
                  onCheckedChange={(checked) => updateViewOption('showIndex', checked)}
                >
                  Show Indexes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={viewOptions.showRelativeTimestamp}
                  onCheckedChange={(checked) => updateViewOption('showRelativeTimestamp', checked)}
                >
                  Relative Timestamp
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={viewOptions.showIpNames}
                  onCheckedChange={(checked) => updateViewOption('showIpNames', checked)}
                >
                  Show IP Names
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={viewOptions.showCallColors}
                  onCheckedChange={(checked) => updateViewOption('showCallColors', checked)}
                  disabled={!Array.isArray(sids) || sids.length <= 1}
                >
                  Differ Calls By Color
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
