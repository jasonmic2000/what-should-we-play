import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Build a chainable mock that tracks calls and returns configured values
// ---------------------------------------------------------------------------

let selectResults: unknown[][] = [];
let selectCallIndex = 0;

function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockImplementation(() => {
    const result = selectResults[selectCallIndex] ?? [];
    selectCallIndex++;
    return Promise.resolve(result);
  });
  return chain;
}

let insertReturningResults: unknown[][] = [];
let insertCallIndex = 0;

function makeInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockImplementation(() => {
    const result = insertReturningResults[insertCallIndex] ?? [];
    insertCallIndex++;
    return Promise.resolve(result);
  });
  // For inserts without returning (e.g., addMember)
  chain.values = vi.fn().mockImplementation(() => {
    // If returning is called, use insertReturningResults
    // Otherwise resolve as void
    return {
      returning: () => {
        const result = insertReturningResults[insertCallIndex] ?? [];
        insertCallIndex++;
        return Promise.resolve(result);
      },
      then: (resolve: (v: unknown) => void) => resolve(undefined),
    };
  });
  return chain;
}

const selectChain = makeSelectChain();
const insertChain = makeInsertChain();

const updateSetWhereMock = vi.fn().mockResolvedValue(undefined);
const updateSetMock = vi.fn().mockReturnValue({ where: updateSetWhereMock });
const updateMock = vi.fn().mockReturnValue({ set: updateSetMock });

const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
const deleteMock = vi.fn().mockReturnValue({ where: deleteWhereMock });

vi.mock("./index", () => ({
  db: {
    select: () => selectChain,
    insert: () => insertChain,
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import {
  createGroup,
  getGroupById,
  getUserGroups,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  setMemberRole,
  getMemberRole,
  countUserCreatedGroups,
} from "./group-repository";

const NOW = new Date("2025-01-01T00:00:00Z");

function makeGroupRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "group-1",
    name: "Test Group",
    creatorUserId: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeMemberRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    groupId: "group-1",
    steamId64: "76561198000000001",
    userId: "user-1",
    role: "admin",
    addedAt: NOW,
    ...overrides,
  };
}

describe("group-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    selectCallIndex = 0;
    insertReturningResults = [];
    insertCallIndex = 0;
  });

  describe("createGroup", () => {
    it("creates a group and adds creator as admin when they have a linked Steam profile", async () => {
      selectResults = [
        // 1. Look up creator's steamId64
        [{ steamId64: "76561198000000001" }],
        // 2. Fetch inserted members
        [
          makeMemberRow(),
          makeMemberRow({ steamId64: "76561198000000002", userId: null, role: "member" }),
        ],
      ];
      insertReturningResults = [
        // insert group returning
        [makeGroupRow()],
      ];

      const result = await createGroup("user-1", "Test Group", ["76561198000000002"]);

      expect(result.name).toBe("Test Group");
      expect(result.members).toHaveLength(2);
      expect(result.members[0].role).toBe("admin");
      expect(result.members[1].role).toBe("member");
    });

    it("creates a group without creator as member when they have no linked Steam profile", async () => {
      selectResults = [
        [{ steamId64: null }],
        [makeMemberRow({ steamId64: "76561198000000002", userId: null, role: "member" })],
      ];
      insertReturningResults = [[makeGroupRow()]];

      const result = await createGroup("user-1", "Test Group", ["76561198000000002"]);

      expect(result.members).toHaveLength(1);
      expect(result.members[0].role).toBe("member");
    });
  });

  describe("getGroupById", () => {
    it("returns null when group is not found", async () => {
      selectResults = [[]];

      const result = await getGroupById("non-existent");

      expect(result).toBeNull();
    });

    it("returns group with members when found", async () => {
      selectResults = [
        [makeGroupRow()],
        [makeMemberRow()],
      ];

      const result = await getGroupById("group-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("group-1");
      expect(result!.members).toHaveLength(1);
      expect(result!.members[0].steamId64).toBe("76561198000000001");
    });
  });

  describe("getUserGroups", () => {
    it("returns groups where user is creator", async () => {
      selectResults = [
        [makeGroupRow()],  // created groups
        [],                // member group rows
      ];

      const result = await getUserGroups("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("group-1");
    });

    it("returns empty array when user has no groups", async () => {
      selectResults = [
        [],  // created groups
        [],  // member group rows
      ];

      const result = await getUserGroups("user-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("updateGroup", () => {
    it("calls db.update with name and updatedAt", async () => {
      await updateGroup("group-1", { name: "New Name" });

      expect(updateMock).toHaveBeenCalledOnce();
      expect(updateSetMock).toHaveBeenCalledOnce();
      const setArg = updateSetMock.mock.calls[0][0];
      expect(setArg.name).toBe("New Name");
      expect(setArg.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("deleteGroup", () => {
    it("calls db.delete with the group id", async () => {
      await deleteGroup("group-1");

      expect(deleteMock).toHaveBeenCalledOnce();
    });
  });

  describe("addMember", () => {
    it("inserts a new member with 'member' role", async () => {
      await addMember("group-1", "76561198000000003");

      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe("removeMember", () => {
    it("deletes the member row", async () => {
      await removeMember("group-1", "76561198000000003");

      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe("setMemberRole", () => {
    it("updates the role for a member", async () => {
      await setMemberRole("group-1", "76561198000000001", "admin");

      expect(updateMock).toHaveBeenCalled();
      const setArg = updateSetMock.mock.calls[0][0];
      expect(setArg.role).toBe("admin");
    });
  });

  describe("getMemberRole", () => {
    it("returns role when found by userId", async () => {
      selectResults = [[{ role: "admin" }]];

      const result = await getMemberRole("group-1", "user-1");

      expect(result).toBe("admin");
    });

    it("returns role when found by steamId64 fallback", async () => {
      selectResults = [
        [],                                      // not found by userId
        [{ steamId64: "76561198000000001" }],    // user's steamId64
        [{ role: "member" }],                    // found by steamId64
      ];

      const result = await getMemberRole("group-1", "user-1");

      expect(result).toBe("member");
    });

    it("returns null when user is not a member", async () => {
      selectResults = [
        [],                    // not found by userId
        [{ steamId64: null }], // user has no steamId64
      ];

      const result = await getMemberRole("group-1", "user-1");

      expect(result).toBeNull();
    });
  });

  describe("countUserCreatedGroups", () => {
    it("returns the count of groups created by the user", async () => {
      selectResults = [[{ value: 3 }]];

      const result = await countUserCreatedGroups("user-1");

      expect(result).toBe(3);
    });

    it("returns 0 when user has no groups", async () => {
      selectResults = [[{ value: 0 }]];

      const result = await countUserCreatedGroups("user-1");

      expect(result).toBe(0);
    });
  });
});
