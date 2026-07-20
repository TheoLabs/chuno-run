import type { AdminAccount } from "./types";

export const mockAdminAccounts: AdminAccount[] = [
  {
    id: 1,
    email: "admin@chuno.run",
    name: "운영총괄",
    status: "active",
    createdAt: "2026-05-01",
    self: true,
  },
  {
    id: 2,
    email: "ops1@chuno.run",
    name: "김운영",
    status: "active",
    createdAt: "2026-06-10",
  },
  {
    id: 3,
    email: "ops2@chuno.run",
    name: "박CS",
    status: "disabled",
    createdAt: "2026-06-20",
  },
];
