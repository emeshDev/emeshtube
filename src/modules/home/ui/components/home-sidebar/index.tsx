import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { MainSection } from "./MainSection";
import { Separator } from "@/components/ui/separator";
import { PersonalSection } from "./PersonalSection";

export const HomeSidebar = () => {
  return (
    <Sidebar className="pt-16 z-40 border-none">
      <SidebarContent className="bg-background">
        <MainSection />
        <Separator />
        <PersonalSection />
      </SidebarContent>
    </Sidebar>
  );
};
