import { NavLink, useLocation, useNavigate } from "react-router"
import {
  ClipboardListIcon,
  FlaskConicalIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useTests } from "@/store/tests-context"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { tests, addTest } = useTests()

  const handleNewTest = () => {
    const id = addTest()
    navigate(`/tests/${id}`)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConicalIcon className="size-4" />
          </div>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Test Builder
          </span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleNewTest}>
                  <PlusIcon />
                  <span>New test</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                  <NavLink to="/">
                    <ClipboardListIcon />
                    <span>All tests</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {tests.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Tests</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tests.map((test) => (
                  <SidebarMenuItem key={test.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === `/tests/${test.id}`}
                    >
                      <NavLink to={`/tests/${test.id}`}>
                        <span className="truncate">{test.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/settings"}
            >
              <NavLink to="/settings">
                <SettingsIcon />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
