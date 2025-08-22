import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Loader } from "lucide-react";
import api from "@/services/api";
import { toApiIsoString } from "@/services/date";
import { CallFlow } from "./CallFlow";

interface SipRegistersProps {
  showFilter?: boolean;
  showFooter?: boolean;
  per_page?: number;
  start_date: string;
  end_date: string;
  onDomainChange?: (domain: string | null) => void;
}

export const SipRegisters: React.FC<SipRegistersProps> = ({
  showFilter = true,
  showFooter = true,
  start_date,
  end_date,
  per_page = 25,
  onDomainChange,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [usersFilter, setUsersFilter] = useState("");
  const [watchModalOpen, setWatchModalOpen] = useState(false);

  useEffect(() => {
    const fetchDomains = async () => {
      setLoadingDomains(true);
      try {
        const params = new URLSearchParams();
        params.append("start_date", toApiIsoString(start_date));
        params.append("end_date", toApiIsoString(end_date));
        const { data } = await api.get<{ data: string[] }>("/sip/registers-domains", { params });
        setDomains(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        setDomains([]);
      } finally {
        setLoadingDomains(false);
      }
    };

    fetchDomains();
  }, [start_date, end_date]);

  const filteredDomains = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return domains;
    return domains.filter((d) => d.toLowerCase().includes(term));
  }, [domains, search]);

  const handleSelect = (domain: string) => {
    const value = selectedDomain === domain ? null : domain;
    setSelectedDomain(value);
    onDomainChange?.(value);
    setOpen(false);
  };

  const handleWatchClick = () => {
    if (selectedDomain) {
      setWatchModalOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {showFilter && (
        <div className="border p-4">
          <div className="flex justify-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="w-full sm:w-[320px]">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {selectedDomain ? selectedDomain : "Select Domain"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0 max-h-80">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search Domain"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <ScrollArea className="h-64">
                    <div className="py-1">
                      {loadingDomains && (
                        <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                          <Loader className="h-4 w-4 animate-spin" />Loading
                        </div>
                      )}
                      {!loadingDomains && filteredDomains.length === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">Domain Not Found</div>
                      )}
                      {!loadingDomains &&
                        filteredDomains.map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => handleSelect(domain)}
                            className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-muted"
                          >
                            <span className="truncate pr-2">{domain}</span>
                            <Check
                              className={
                                "h-4 w-4 " + (selectedDomain === domain ? "opacity-100" : "opacity-0")
                              }
                            />
                          </button>
                        ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-4 w-full">
              <Input
                placeholder="Users Filter. Separate them by a comma (2704,6006, 34682368)"
                className="w-full"
                value={usersFilter}
                onChange={(e) => setUsersFilter(e.target.value)}
              />
              <Button disabled={!selectedDomain} onClick={handleWatchClick}>Watch For Registers on This Domain</Button>
            </div>
          </div>
        </div>
      )}

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>User Agent</TableHead>
              <TableHead>Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                foo bar
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {showFooter && (
        <>
          <Separator />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing x Registers</span>
            <span>Page 1 of 1</span>
          </div>
        </>
      )}
      
      <CallFlow
        open={watchModalOpen}
        onOpenChange={setWatchModalOpen}
        sids="watch"
        isWatchMode={true}
        watchConfig={{
          domain: selectedDomain || "",
          users: usersFilter.split(',').map(u => u.trim()).filter(u => u.length > 0)
        }}
      />
    </div>
  );
}; 