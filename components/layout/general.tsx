import { ComponentProps, ReactNode } from "react";
import Sidebar from "../compound/Sidebar";

type GeneralLayoutProps = ComponentProps<typeof Sidebar> & {
  children: ReactNode;
};

const GeneralLayout = ({ children, ...sidebarProps }: GeneralLayoutProps) => {
  return (
    <div className="flex h-screen">
      <Sidebar {...sidebarProps} />
      <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
};

export default GeneralLayout;
