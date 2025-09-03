import { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter as DialogFooterUI, DialogHeader as DialogHeaderUI, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RolePerm {
  role_id: number;
  role_name: string;
}

interface MeResponseItem {
  id: number;
  username: string;
  full_name: string;
  roles_perms: RolePerm[];
}

export default function MeCard() {
  const [data, setData] = useState<MeResponseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<{ you: MeResponseItem[] }>("/users/me");
        if (!mounted) return;
        setData(res.data.you?.[0] ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load user info");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className="w-full rounded-none cursor-default">
      <CardHeader>
        <CardTitle>You!!</CardTitle>
        <CardDescription>Here are some information about the logged-in user</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}
        {!loading && error && (
          <div className="text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Your Username: </span>
              <span className="font-medium">{data.username}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Your Full name: </span>
              <span className="font-medium">{data.full_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Your Roles: </span>
              {data.roles_perms && data.roles_perms.length > 0 ? (
                <span className="font-medium">
                  {data.roles_perms.map((r) => r.role_name).join(", ")}
                </span>
              ) : (
                <span className="font-medium">—</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Dialog open={open} onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setFormError(null);
            setFormSuccess(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" disabled={loading || !!error}>
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeaderUI>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and a new password. The new password must be at least 8 characters and match the confirmation.
              </DialogDescription>
            </DialogHeaderUI>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="old_password">Old Password</Label>
                <Input
                  id="old_password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {formError && (
                <div className="text-sm text-red-600">{formError}</div>
              )}
              {formSuccess && (
                <div className="text-sm text-green-600">{formSuccess}</div>
              )}
            </div>
            <DialogFooterUI>
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setFormError(null);
                  setFormSuccess(null);
                  if (!data) return;
                  if (newPassword.length < 8) {
                    setFormError("New password must be at least 8 characters long.");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setFormError("New password and confirmation do not match.");
                    return;
                  }
                  try {
                    setSubmitting(true);
                    const res = await api.post<{ message: string }>("/change-password", {
                      id: data.id,
                      old_password: oldPassword,
                      new_password: newPassword,
                    });
                    setFormSuccess(res.data.message || "Password changed successfully.");
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch (e: any) {
                    const msg = e?.response?.data?.message || e?.message || "Failed to change password";
                    setFormError(msg);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || !oldPassword || !newPassword || !confirmPassword}
              >
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooterUI>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
