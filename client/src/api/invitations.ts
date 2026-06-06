import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InvitationSchema } from "@hatchery/common";
import type { Invitation } from "@hatchery/common";

import { openApiClient } from "./client.js";

export const INVITATIONS_QUERY_KEY = ["admin", "invitations"] as const;

export async function fetchInvitations(): Promise<Invitation[]> {
  const { data, error, response } = await openApiClient.GET("/api/admin/invitations", {
    credentials: "include",
  });
  if (error || !response.ok) throw new Error(`GET /api/admin/invitations failed: ${response.status}`);
  return InvitationSchema.array().parse(data);
}

export async function createInvitation(input: {
  expiresInHours: number;
  memo?: string;
}): Promise<Invitation> {
  const { data, response } = await openApiClient.POST("/api/admin/invitations", {
    body: input,
    credentials: "include",
  });
  if (!response.ok || !data) throw new Error(`POST /api/admin/invitations failed: ${response.status}`);
  return InvitationSchema.parse(data);
}

export async function revokeInvitation(id: string): Promise<Invitation> {
  const { data, response } = await openApiClient.POST("/api/admin/invitations/{id}/revoke", {
    params: { path: { id } },
    credentials: "include",
  });
  if (!response.ok || !data) throw new Error(`POST /api/admin/invitations/${id}/revoke failed: ${response.status}`);
  return InvitationSchema.parse(data);
}

export function useInvitations() {
  return useQuery({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: fetchInvitations,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY }),
  });
}
