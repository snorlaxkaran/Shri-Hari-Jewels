import { describe, expect, it, vi } from "vitest";
import { attachOrganization } from "../middleware/organization.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import type { Response, NextFunction } from "express";

describe("attachOrganization", () => {
  it("blocks SuperAdmin from tenant ERP routes", async () => {
    const req = {
      user: { id: "admin-1", role: "SuperAdmin" },
      originalUrl: "/api/sales",
    } as AuthenticatedRequest;
    const json = vi.fn();
    const res = {
      status: vi.fn(() => ({ json })),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    await attachOrganization(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: "Platform admin cannot access company ERP data directly.",
    });
  });
});
