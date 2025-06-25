import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader } from "lucide-react";
import api from "@/services/api";
import type { Trunk, TrunksResponse } from "@/types/trunk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const TrunkTable: React.FC = () => {
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ip: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrunks = () => {
    setLoading(true);
    api.get<TrunksResponse>("/sip/trunks")
      .then((res) => {
        setTrunks(res.data.gateways);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrunks();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/sip/trunks", {
        name: form.name,
        ip: form.ip,
        description: form.description || undefined,
      });
      setOpen(false);
      setForm({ name: "", ip: "", description: "" });
      fetchTrunks();
    } catch (err: any) {
      setError(err?.response?.data?.summary || "Failed to create trunk");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full selection:bg-primary selection:text-primary-foreground">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Trunks</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default">Create Trunk</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Trunk</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleFormChange}
                required
              />
              <Input
                name="ip"
                placeholder="IP Address"
                value={form.ip}
                onChange={handleFormChange}
                required
              />
              <Input
                name="description"
                placeholder="Description (optional)"
                value={form.description}
                onChange={handleFormChange}
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader className="mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : trunks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No trunks found
                  </TableCell>
                </TableRow>
              ) : (
                trunks.map((trunk) => (
                  <TableRow key={trunk.id}>
                    <TableCell>{trunk.id}</TableCell>
                    <TableCell>{trunk.name}</TableCell>
                    <TableCell>{trunk.ip}</TableCell>
                    <TableCell>{trunk.description || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default TrunkTable; 