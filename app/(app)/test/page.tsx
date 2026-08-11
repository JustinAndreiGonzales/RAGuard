"use client";

import { useState } from "react";
import Sidebar from "@/components/compound/Sidebar";

const page = () => {
  const [activeNav, setActiveNav] = useState<
    "chat" | "documents" | "teams" | "users"
  >("chat");

  return (
    <div className="flex">
      <Sidebar
        activeNav={activeNav}
        onNavigate={setActiveNav}
        role="admin"
        userName="Alice Kim"
        userEmail="alice@company.com"
        userInitials="AK"
        onAccountClick={() => {}}
        onSignOutClick={() => {}}
      />
    </div>
  );
};

export default page;
