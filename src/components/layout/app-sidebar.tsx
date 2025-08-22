import {
  KeyRound,
  LayoutDashboard,
  PhoneCall,
  Server,
  Settings,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

import { Link, useLocation } from "react-router";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Calls",
    url: "/sip/calls",
    icon: PhoneCall,
  },
  {
    title: "Registers",
    url: "/sip/registers",
    icon: KeyRound,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
  },
  {
    title: "Trunks",
    url: "/trunks",
    icon: Server,
  },
];

export function AppSidebar() {
  const location = useLocation();
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="selection:bg-primary selection:text-primary-foreground"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Marge</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
