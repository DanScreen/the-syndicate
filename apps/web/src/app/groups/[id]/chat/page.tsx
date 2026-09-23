"use client";

import { GroupThread } from "@/components/group/chat";
import { useGroupData } from "@tiki-acca/client";
import { useSession } from "next-auth/react";

export default function GroupChatPage() {
  const { data: session } = useSession();
  const { data, markChatRead } = useGroupData();

  if (!data) return null;

  return (
    <section className="mx-auto max-w-3xl">
      <GroupThread
        groupId={data.group.id}
        currentUserId={session?.user?.id}
        isOwner={data.isOwner}
        onRead={markChatRead}
      />
    </section>
  );
}
