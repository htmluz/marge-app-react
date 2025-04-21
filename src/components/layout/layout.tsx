import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Outlet } from "react-router";
import { ModeToggle } from "./mode-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";
import { TimestampSelect } from "./timestamp-selector";

export default function Layout() {
  const { signOut } = useAuth();
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full h-full">
        <div
          id="topbar"
          className="sticky top-0 z-50 backdrop-blur-sm flex justify-between mx-[8px] border-b mb-[16px] py-[4px]"
        >
          <SidebarTrigger />
          <div className="flex">
            <div className="border-r mr-2 pr-2 ">
              <TimestampSelect />
            </div>
            <ModeToggle />
            <Button variant="ghost" className="size-7" onClick={signOut}>
              <LogOut />
            </Button>
          </div>
        </div>
        <div className="mx-[16px] mb-[16px]">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
