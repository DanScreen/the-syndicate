import { requireSession } from "@/lib/api-auth";
import {
  getGroupMessages,
  postGroupMessage,
} from "@/lib/chat/group-thread-route";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;
  return getGroupMessages(request, id, session!.user!.id);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;
  return postGroupMessage(request, id, session!.user!.id);
}
