import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/services/api";
import {
  ArrowLeftRight,
  ArrowRightLeft,
  ChartSpline,
  Info,
  Loader,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Separator } from "./ui/separator";
import { CallFlow } from "./CallFlow";
import { VoiceDetail } from "./RtcpDetails";
import { toApiIsoString } from "@/services/date";

// Interfaces
interface Call {
  sid: string;
  create_date: string;
  start_date: string;
  end_date: string;
  caller: string;
  callee: string;
}

interface CallsResponse {
  calls: Call[];
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
}

interface CallsFilter {
  page: number;
  per_page: number;
  start_date: string;
  end_date: string;
  call_id?: string;
  caller?: string;
  callee?: string;
}

interface Column {
  key: keyof Call;
  label: string;
  format?: (value: any) => string;
  input: boolean;
}

interface SipCallsProps {
  showFilter?: boolean;
  showFooter?: boolean;
  per_page?: number;
  start_date: string;
  end_date: string;
}

const fetchCalls = async (filters: CallsFilter): Promise<CallsResponse> => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== "") {
      params.append(key, String(val));
    }
  });

  const response = await api.get<CallsResponse>("/sip/calls", { params });
  return response.data;
};

export const SipCalls: React.FC<SipCallsProps> = ({
  showFilter = true,
  showFooter = true,
  start_date,
  end_date,
  per_page = 25,
}) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<Call[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [callFlowModal, setCallFlowModal] = useState(false);
  const [voiceDetailModal, setVoiceDetailModal] = useState(false);
  const [callFlowSid, setCallFlowSid] = useState<string>("");
  const [callFlowSids, setCallFlowSids] = useState<string[]>([]);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const [filters, setFilters] = useState<CallsFilter>({
    page: 1,
    per_page: per_page,
    start_date,
    end_date,
    call_id: "",
    caller: "",
    callee: "",
  });
  const [inputFilters, setInputFilters] = useState<CallsFilter>({
    page: 1,
    per_page: 25,
    start_date,
    end_date,
    call_id: "",
    caller: "",
    callee: "",
  });

  const columns: Column[] = [
    {
      key: "create_date",
      label: "Start Date",
      format: (value: string) => formatDate(value),
      input: false,
    },
    { key: "caller", label: "Caller", input: true },
    { key: "callee", label: "Callee", input: true },
    { key: "sid", label: "Call ID", input: true },
  ];

  const filteredColumns = columns.filter((col) => col.input);

  function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy HH:mm:ss");
    } catch {
      return dateStr;
    }
  }

  const loadCalls = async () => {
    if (!inputFilters.start_date || !inputFilters.end_date) return;
    setLoading(true);
    try {
      const apiFilters = { ...filters };
      if (apiFilters.start_date) {
        apiFilters.start_date = toApiIsoString(apiFilters.start_date);
      }
      if (apiFilters.end_date) {
        apiFilters.end_date = toApiIsoString(apiFilters.end_date);
      }
      const res = await fetchCalls(apiFilters);
      setCalls(res.calls);
      setTotalCalls(res.total || 0);
      setTotalPages(res.total_pages || 1);
      setHasMorePages(currentPage * pageSize < (res.total || 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    setFilters((prev) => ({ ...prev, page }));
  };

  const updatePageSize = (size: number) => {
    setPageSize(size);
    setFilters((prev) => ({ ...prev, per_page: size }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setInputFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    setCurrentPage(1);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.debug("[DEBUG] - Debounce inicial pulado");
      return;
    }

    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    filterTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        ...inputFilters,
        page: 1,
      }));
    }, 500);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [inputFilters]);

  const isSelected = (call: Call) => {
    return selectedCalls.some((selected) => selected.sid === call.sid);
  };

  const toggleSelect = (call: Call) => {
    if (isSelected(call)) {
      setSelectedCalls(
        selectedCalls.filter((selected) => selected.sid !== call.sid)
      );
    } else {
      setSelectedCalls([...selectedCalls, call]);
    }
  };

  const handleOpenCallFlow = (sid: string) => {
    setCallFlowSid(sid);
    setCallFlowSids([]);
    setCallFlowModal(true);
  };

  const handleOpenSelectedCallsFlow = () => {
    const selectedSids = selectedCalls.map(call => call.sid);
    setCallFlowSids(selectedSids);
    setCallFlowSid("");
    setCallFlowModal(true);
  };

  const handleOpenVoiceDetails = (sid: string) => {
    setCallFlowSid(sid);
    setVoiceDetailModal(true);
  };

  useEffect(() => {
    if (!start_date || !end_date) return;
    setFilters((prev) => ({
      ...prev,
      start_date,
      end_date,
    }));
  }, [start_date, end_date, currentPage, pageSize]);

  useEffect(() => {
    setSelectedCalls([]);
    loadCalls();
  }, [filters]);

  return (
    <div className="w-full selection:bg-primary selection:text-primary-foreground">
      {/* Filters */}
      {showFilter && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredColumns.map((column) => (
            <div key={column.key} className="space-y-2">
              <label htmlFor={column.key} className="text-sm font-medium">
                {column.label}
              </label>
              <Input
                id={column.key}
                value={inputFilters[column.key as keyof CallsFilter] || ""}
                onChange={(e) => handleFilterChange(column.key, e.target.value)}
                placeholder={`Filter by ${column.label.toLowerCase()}`}
              />
            </div>
          ))}
          <label className="text-xs italic text-muted-foreground">
            Use * as a wildcard
          </label>
        </div>
      )}

      {/* Table */}
      <div className="relative">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    disabled={true}
                    checked={
                      calls.length > 0 && selectedCalls.length === calls.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCalls([...calls]);
                      } else {
                        setSelectedCalls([]);
                      }
                    }}
                  />
                </TableHead>
                {columns.map((column) => (
                  <TableHead className="cursor-default" key={column.key}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="text-center h-24"
                  >
                    No calls found
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call) => (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <TableRow
                        key={call.sid}
                        className={isSelected(call) ? "bg-muted/50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected(call)}
                            onCheckedChange={() => toggleSelect(call)}
                          />
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell
                            key={`${call.sid}-${column.key}`}
                            className="cursor-default"
                            onClick={() => toggleSelect(call)}
                          >
                            {column.format
                              ? column.format(call[column.key])
                              : call[column.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          alert(JSON.stringify(call));
                        }}
                        className="flex justify-between"
                      >
                        Call Details
                        <Info />
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          handleOpenVoiceDetails(call.sid);
                        }}
                        className="flex justify-between"
                      >
                        Voice Quality Info
                        <ChartSpline />
                      </ContextMenuItem>
                      <Separator className="my-1" />
                      <ContextMenuItem
                        onClick={() => {
                          handleOpenCallFlow(call.sid);
                        }}
                        className="flex justify-between"
                      >
                        Call Flow
                        <ArrowLeftRight />
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          handleOpenSelectedCallsFlow();
                        }}
                        className="flex justify-between"
                        disabled={selectedCalls.length < 2}
                      >
                        Selected Calls Flow
                        <ArrowRightLeft />
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {loading && (
          <div
            className="
            absolute inset-0 z-10 flex items-center justify-center
            backdrop-blur-sm border rounded-lg
          "
          >
            <Loader className="animate-spin text-4xl" />
          </div>
        )}
      </div>

      {/* Pagination */}
      {showFooter && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Showing {calls.length} of {totalCalls} calls
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => updatePageSize(Number(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(currentPage + 1)}
              disabled={!hasMorePages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CallFlow
        open={callFlowModal}
        onOpenChange={setCallFlowModal}
        sids={callFlowSids.length > 0 ? callFlowSids : callFlowSid}
      />

      <VoiceDetail
        open={voiceDetailModal}
        onOpenChange={setVoiceDetailModal}
        sid={callFlowSid}
      />
    </div>
  );
};
