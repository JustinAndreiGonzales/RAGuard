"use client";

import Select from "@/components/Select";
import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";

const page = () => {
  const VARIETALS = [
    { value: "concord", label: "Concord" },
    { value: "muscat", label: "Muscat" },
    { value: "riesling", label: "Riesling" },
    { value: "syrah", label: "Syrah" },
    { value: "tempranillo", label: "Tempranillo" },
  ];

  const [selected, setSelected] = useState("riesling");

  return (
    <div className="h-4xl p-4 flex gap-md`">
      <Select
        label="Testing"
        options={VARIETALS}
        value={selected}
        onValueChange={setSelected}
        placeholder="Select one"
      />
      <div>
        <StatusBadge status="processing" />
        <StatusBadge status="ready" />
        <StatusBadge status="failed" />
        <StatusBadge status="pending" />
      </div>
    </div>
  );
};

export default page;
